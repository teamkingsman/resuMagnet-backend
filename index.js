const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 5000
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const corsOptions = {
    origin: ['http://localhost:5173', 
    'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  app.use(express.json())
  app.use(cookieParser())
  app.use(morgan('dev'))
  // app.use(express.urlencoded({ extended: true }));


//MongoDB Connection String
const uri = `mongodb+srv://${process.env.USERNAME_DB}:${process.env.PASSWORD_DB}@resumagnet.nz3woaw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



//Connect to MongoDB
async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
  run().catch(console.dir);



//Start server
app.get('/', (req, res) => {
    res.send('Hello from ResuMagnet Server.')
  })
  
  app.listen(port, () => {
    console.log(`ResuMagnet is running on port ${port}`)
  })
  