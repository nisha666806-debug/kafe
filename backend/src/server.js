import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { query } from './db.js';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({limit:'1mb'}));
app.get('/api/health', async (_req,res)=>{
  try { await query('SELECT 1'); res.json({ok:true,service:'oshi-forom-api'}); }
  catch(e){ res.status(503).json({ok:false,error:'database_unavailable'}); }
});

function requireRestaurant(req,res,next){
  const id=req.header('x-restaurant-id');
  if(!id) return res.status(400).json({error:'x-restaurant-id required'});
  req.restaurantId=id; next();
}

app.get('/api/orders', requireRestaurant, async (req,res)=>{
  const status=req.query.status || 'active';
  const {rows}=await query(`SELECT o.*, COALESCE(json_agg(json_build_object('id',oi.id,'productId',oi.product_id,'name',oi.name_snapshot,'qty',oi.qty,'unitPrice',oi.unit_price,'lineTotal',oi.line_total)) FILTER (WHERE oi.id IS NOT NULL),'[]') items
    FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
    WHERE o.restaurant_id=$1 AND o.archived=false AND o.status=$2
    GROUP BY o.id ORDER BY o.updated_at DESC`,[req.restaurantId,status]);
  res.json({ok:true,orders:rows});
});

app.post('/api/orders', requireRestaurant, async (req,res)=>{
  const o=req.body||{};
  const client = await (await import('./db.js')).pool.connect();
  try{
    await client.query('BEGIN');
    await client.query(`INSERT INTO orders(id,restaurant_id,table_id,status,customer_type,customer_phone,total,subtotal,service_charge,created_by,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,NOW()),NOW())
      ON CONFLICT(id) DO UPDATE SET table_id=EXCLUDED.table_id,status=EXCLUDED.status,customer_type=EXCLUDED.customer_type,customer_phone=EXCLUDED.customer_phone,total=EXCLUDED.total,subtotal=EXCLUDED.subtotal,service_charge=EXCLUDED.service_charge,updated_at=NOW()`,
      [o.id,req.restaurantId,o.tableId||null,o.status||'active',o.customerType||null,o.customerPhone||null,Number(o.total)||0,Number(o.subtotal)||0,Number(o.serviceCharge)||0,o.createdBy||null,o.createdAt||null]);
    await client.query('DELETE FROM order_items WHERE order_id=$1',[o.id]);
    for(const i of (Array.isArray(o.items)?o.items:[])) await client.query(`INSERT INTO order_items(id,order_id,product_id,name_snapshot,qty,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)`,[i.id||crypto.randomUUID(),o.id,i.productId||null,String(i.name||''),Number(i.qty)||0,Number(i.unitPrice||i.price)||0,Number(i.lineTotal||0)]);
    await client.query('COMMIT');
    broadcast(req.restaurantId,{type:'order.changed',id:o.id});
    res.status(201).json({ok:true,id:o.id});
  }catch(e){ await client.query('ROLLBACK'); res.status(500).json({ok:false,error:'order_save_failed'}); }
  finally{client.release();}
});

const server=http.createServer(app);
const wss=new WebSocketServer({server,path:'/ws'});
const rooms=new Map();
function broadcast(restaurantId,msg){ const set=rooms.get(restaurantId); if(!set)return; for(const ws of set) if(ws.readyState===1) ws.send(JSON.stringify(msg)); }
wss.on('connection',(ws,req)=>{
  const url=new URL(req.url,'http://localhost'); const restaurantId=url.searchParams.get('restaurant');
  if(!restaurantId){ws.close(1008,'restaurant required');return;}
  if(!rooms.has(restaurantId)) rooms.set(restaurantId,new Set()); rooms.get(restaurantId).add(ws);
  ws.on('close',()=>{rooms.get(restaurantId)?.delete(ws); if(!rooms.get(restaurantId)?.size)rooms.delete(restaurantId);});
});
const port=Number(process.env.PORT||3000);
server.listen(port,()=>console.log(`Oshi Forom API listening on :${port}`));
