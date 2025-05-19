const uri = process.env.MONGODB_URI || "mongodb+srv://jchapman7:<db_password>@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority&appName=Justhetip";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function runMongoTest() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}

testConnection();
runMongoTest().catch(console.dir);
