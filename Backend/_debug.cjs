const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const low = await p.notification.findMany({ where: { type: 'LOW_STOCK_WARNING' }, take: 5, orderBy: { createdAt: 'desc' } });
  console.log('LOW_STOCK count:', low.length);
  low.forEach(n => console.log(JSON.stringify({ id: n.id, title: n.title, userId: n.userId, targetRole: n.targetRole })));
  const all = await p.notification.count();
  console.log('Total notifications:', all);
  await p['\u0024disconnect']();
})();
