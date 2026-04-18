import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  healthTip: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  announcement: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

const AppErrorMock = jest.fn((message, status) => {
  const error = new Error(message);
  error.statusCode = status;
  return error;
});

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/errors.js", () => ({
  AppError: AppErrorMock,
}));

const contentController = await import("../src/controllers/content.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createReq = (query = {}, params = {}) => ({
  query,
  params,
});

describe("content.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("getActiveHealthTips", () => {
    it("retrieves all active and published health tips", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000 * 60 * 60);
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60);

      prismaMock.healthTip.findMany.mockResolvedValue([
        {
          id: "tip-1",
          title: "Hydration Tips",
          content: "Drink water",
          category: "wellness",
          imageUrl: "url1",
          publishDate: pastDate,
          createdAt: pastDate,
        },
        {
          id: "tip-2",
          title: "Sleep Guide",
          content: "Sleep 8 hours",
          category: "sleep",
          imageUrl: "url2",
          publishDate: pastDate,
          createdAt: pastDate,
        },
      ]);

      const req = createReq();
      const res = createRes();
      const next = jest.fn();

      await contentController.getActiveHealthTips(req, res, next);

      expect(prismaMock.healthTip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          orderBy: { publishDate: "desc" },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
          data: expect.arrayContaining([
            expect.objectContaining({ id: "tip-1" }),
            expect.objectContaining({ id: "tip-2" }),
          ]),
        })
      );
    });

    it("filters out expired health tips", async () => {
      const now = new Date();
      prismaMock.healthTip.findMany.mockResolvedValue([]);

      const req = createReq();
      const res = createRes();
      const next = jest.fn();

      await contentController.getActiveHealthTips(req, res, next);

      const callArgs = prismaMock.healthTip.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          { expiryDate: null },
          expect.objectContaining({ expiryDate: expect.any(Object) }),
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

});

  describe("getLatestHealthTip", () => {
    it("retrieves the latest published health tip", async () => {
      const pastDate = new Date();
      prismaMock.healthTip.findFirst.mockResolvedValue({
        id: "tip-1",
        title: "Recent Tip",
        content: "Content here",
        category: "health",
        imageUrl: "url",
        publishDate: pastDate,
      });

      const req = createReq();
      const res = createRes();
      const next = jest.fn();

      await contentController.getLatestHealthTip(req, res, next);

      expect(prismaMock.healthTip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          orderBy: { publishDate: "desc" },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: "tip-1" }),
        })
      );
    });

    it("returns null when no health tips available", async () => {
      prismaMock.healthTip.findFirst.mockResolvedValue(null);

      const req = createReq();
      const res = createRes();
      const next = jest.fn();

      await contentController.getLatestHealthTip(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
        })
      );
    });
  });

  describe("getActiveAnnouncements", () => {
    it("retrieves all active announcements without role filter", async () => {
      const pastDate = new Date();
      prismaMock.announcement.findMany.mockResolvedValue([
        {
          id: "ann-1",
          title: "Announcement 1",
          message: "Message 1",
          type: "info",
          priority: 5,
          targetRole: null,
          publishDate: pastDate,
          createdAt: pastDate,
        },
      ]);

      const req = createReq();
      const res = createRes();
      const next = jest.fn();

      await contentController.getActiveAnnouncements(req, res, next);

      expect(prismaMock.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          orderBy: [{ priority: "desc" }, { publishDate: "desc" }],
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
        })
      );
    });

    it("filters announcements by target role", async () => {
      const pastDate = new Date();
      prismaMock.announcement.findMany.mockResolvedValue([
        {
          id: "ann-1",
          title: "Pharmacy Announcement",
          message: "For pharmacies",
          type: "alert",
          priority: 7,
          targetRole: "PHARMACY",
          publishDate: pastDate,
          createdAt: pastDate,
        },
      ]);

      const req = createReq({ targetRole: "PHARMACY" });
      const res = createRes();
      const next = jest.fn();

      await contentController.getActiveAnnouncements(req, res, next);

      const callArgs = prismaMock.announcement.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          { targetRole: null },
          { targetRole: "PHARMACY" },
          { targetRole: "ALL" },
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

