import { MongoClient } from 'mongodb';

const LOCAL = 'mongodb://127.0.0.1:27017/parksmart';
const ATLAS =
  'mongodb+srv://suryavikas1223_db_user:E50eqG6DxQLwIYqO@cluster0.di4dwjr.mongodb.net/ParkSmart?appName=Cluster0';

const local = await MongoClient.connect(LOCAL, { serverSelectionTimeoutMS: 10000 });
console.log('Connected to LOCAL MongoDB');

const atlas = await MongoClient.connect(ATLAS, { serverSelectionTimeoutMS: 60000 });
console.log('Connected to ATLAS MongoDB');

const ldb = local.db();
const adb = atlas.db();

const names = await ldb.listCollections().toArray();
let total = 0;
for (const c of names) {
  const coll = c.name;
  if (coll.startsWith('system.')) continue;
  const docs = await ldb.collection(coll).find({}).toArray();
  await adb.collection(coll).drop().catch(() => {});
  if (docs.length) {
    await adb.collection(coll).insertMany(docs, { ordered: false });
  }
  total += docs.length;
  console.log(`${coll}: ${docs.length} docs copied`);
}

console.log(`\nDone. ${total} total docs copied to ParkSmart on Atlas.`);
await local.close();
await atlas.close();