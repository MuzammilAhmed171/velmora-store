import { Router } from "express";
import { Warehouse, StockItem, StockTransfer } from "../models/ops";
import { Product } from "../models/catalog";
import { ah, ok, fail, ser } from "../lib/util";
import { requireAdmin } from "../middleware/auth";

const r = Router();

r.get("/", requireAdmin, ah(async (_req, res) => {
  const list = await Warehouse.find().sort({ name: 1 });
  return ok(res, { warehouses: ser(list) });
}));

r.post("/", requireAdmin, ah(async (req, res) => {
  const { name, location } = req.body;
  if (!name) return fail(res, "Name required");
  const wh = await Warehouse.create({ name, location: location || null });
  return ok(res, { warehouse: ser(wh) });
}));

r.put("/:id", requireAdmin, ah(async (req, res) => {
  const wh = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!wh) return fail(res, "Not found", 404);
  return ok(res, { warehouse: ser(wh) });
}));

r.get("/stock", requireAdmin, ah(async (req, res) => {
  const warehouseId = req.query.warehouseId ? String(req.query.warehouseId) : null;
  const items = await StockItem.find(warehouseId ? { warehouseId } : {})
    .populate("productId warehouseId")
    .limit(200);
  return ok(res, { stock: ser(items) });
}));

r.post("/stock", requireAdmin, ah(async (req, res) => {
  const { warehouseId, productId, qty } = req.body;
  if (!warehouseId || !productId) return fail(res, "Warehouse and product required");
  const item = await StockItem.findOneAndUpdate(
    { warehouseId, productId },
    { qty: Number(qty) || 0 },
    { new: true, upsert: true }
  );
  return ok(res, { stock: ser(item) });
}));

r.post("/transfer", requireAdmin, ah(async (req, res) => {
  const { fromId, toId, productId, qty } = req.body;
  const q = Math.round(Number(qty) || 0);
  if (!fromId || !toId || !productId || q <= 0) return fail(res, "Invalid transfer");
  if (fromId === toId) return fail(res, "Warehouses must differ");
  const from = await StockItem.findOne({ warehouseId: fromId, productId });
  if (!from || from.qty < q) return fail(res, "Insufficient stock in source warehouse");
  from.qty -= q;
  await from.save();
  const to = await StockItem.findOneAndUpdate(
    { warehouseId: toId, productId },
    { $inc: { qty: q } },
    { new: true, upsert: true }
  );
  const transfer = await StockTransfer.create({ fromId, toId, productId, qty: q, status: "COMPLETED" });
  return ok(res, { transfer: ser(transfer), stock: ser(to) });
}));

r.get("/transfers", requireAdmin, ah(async (_req, res) => {
  const list = await StockTransfer.find().sort({ createdAt: -1 }).limit(100).populate("productId");
  return ok(res, { transfers: ser(list) });
}));

export default r;
