import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    update: jest.fn(),
  },
};

const singleMock = jest.fn(() => "upload-middleware");

jest.unstable_mockModule("multer", () => ({
  default: jest.fn(() => ({
    single: singleMock,
  })),
}));

jest.unstable_mockModule("multer-storage-cloudinary", () => ({
  CloudinaryStorage: class CloudinaryStorage {
    constructor(options) {
      this.options = options;
    }
  },
}));

jest.unstable_mockModule("../src/config/cloudinary.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const userController = await import("../src/modules/user/user.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("user.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an uploaded avatar file", async () => {
    const req = { user: { userId: "u-1" }, file: null };
    const res = createRes();
    const next = jest.fn();

    await userController.updateAvatar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Avatar image is required" })
    );
  });

  it("updates avatar url and returns updated user", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "u-1",
      name: "User",
      email: "user@example.com",
      avatarUrl: "https://cdn.example.com/avatar.jpg",
      roleId: 3,
    });

    const req = {
      user: { userId: "u-1" },
      file: { path: "https://cdn.example.com/avatar.jpg" },
    };
    const res = createRes();
    const next = jest.fn();

    await userController.updateAvatar(req, res, next);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u-1" },
        data: { avatarUrl: "https://cdn.example.com/avatar.jpg" },
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Profile photo updated successfully",
        data: { user: expect.objectContaining({ id: "u-1" }) },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
  