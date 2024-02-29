const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const port = process.env.PORT || 5000;
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://resu-magnet-frontend.vercel.app",
    "https://resu-magnet-backend.vercel.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
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

const database = client.db("resuMagnet");
const userCollection = database.collection("userCollection");
const resumeCollection = database.collection("resumeCollection");
const cvCollection = database.collection("cvCollection");
const coverLetterCollection = database.collection("coverLetterCollection");
const resumePublicCollection = database.collection("resumePublicCollection");
const postCollection = database.collection("postCollection");
const commentCollection = database.collection("commentCollection");

//JWT Middleware
app.post("/api/v1/auth/access-token", async (req, res) => {
  const body = req.body;
  const token = jwt.sign(body, process.env.ACCESS_TOKEN, { expiresIn: "10h" });
  const expirationDate = new Date(); // Create a new Date object
  expirationDate.setDate(expirationDate.getDate() + 365); // Set the expiration date to 365 days from the current date
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      expires: expirationDate,
    })
    .send({ massage: "success" });
});

//logout
app.get("/api/v1/auth/logout", async (req, res) => {
  try {
    // const user = req.body;
    res.clearCookie("token", { maxAge: 0 }).send({ message: "success" });
  } catch {
    console.log(error);
  }
});
const verify = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// User related API
app.post("/api/v1/create-users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const result = await userCollection.insertOne({
    ...user,
    timestamp: Date.now(),
  });
  res.send(result);
});
app.put("/users/:email", async (req, res) => {
  const email = req.params.email;
  const user = req.body;
  const query = { email: email };
  const options = { upsert: true };
  const isExist = await userCollection.findOne(query);
  console.log("User found?----->", isExist);
  if (isExist) {
    if (user?.status === "Requested") {
      const result = await userCollection.updateOne(
        query,
        {
          $set: user,
        },
        options
      );
      return res.send(result);
    } else {
      return res.send(isExist);
    }
  }
  const result = await userCollection.updateOne(
    query,
    {
      $set: { ...user, timestamp: Date.now() },
    },
    options
  );
  res.send(result);
});
// all user data get
app.get("/api/v1/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// user data get by email
app.get("/api/v1/users/:email", verify, async (req, res) => {
  try {
    const email = req.params.email;
    const result = await userCollection.findOne({ email });
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
// ----------Public share api--------//

// app.get("/api/v1/publicResume/:id", async (req, res) => {
//   try {
//     const id = req.params.id;
//     const publicQuery = { _id: new ObjectId(id) }
//     const publicResult = await resumePublicCollection.findOne(publicQuery);
//     const query = { _id: new ObjectId(publicResult.resumeId) }
//     const result = await resumeCollection.findOne(query);
//     res.send(result)
//   }
//   catch (error) {
//     console.log(error)
//   }
// })
// app.post('/api/v1/publicResume', async (req, res) => {
//   const data = req.body;
//   const result = await resumePublicCollection.insertOne(user);
//   const query = { resumeId: data.resumeId }
//   const rsultId = await resumeCollection.findOne(query)
//   res.send(rsultId);

// })
// ----------------------Post Api---------------- //
// create post
app.post("/api/v1/posts", async (req, res) => {
  const item = req.body;
  const result = await postCollection.insertOne(item);
  res.send(result);
});
// get post
app.get("/api/v1/posts", async (req, res) => {
  const result = await postCollection.find().toArray();
  res.send(result);
});
// get specific post
app.get("/api/v1/posts/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await postCollection.findOne(query);
  res.send(result);
});
// like dislike
app.patch("/api/v1/posts/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await postCollection.updateOne(query, req.body);
  res.send(result);
});
// --------comments api---------//
// add comment
app.post("/api/v1/comment", async (req, res) => {
  const item = req.body;
  const result = await commentCollection.insertOne(item);
  res.send(result);
});

// get comment by post id
app.get("/api/v1/comment/:postId", async (req, res) => {
  const postId = req.params.postId;
  const query = { postId: postId };
  const comments = await commentCollection.find(query).toArray();
  res.send(comments);
});
 
// ---------------------- Resume Api ----------------- //
// resume api
app.get("/api/v1/resume/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await resumeCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});


app.get("/api/v1/getresume/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await resumeCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
//save resume data or update
app.put("/api/v1/resume", async (req, res) => {
  try {
    const resume = req.body;
    const query = { userEmail: resume.userEmail };
    const existingResume = await resumeCollection.findOne(query);

    if (existingResume) {
      const result = await resumeCollection.updateOne(
        { _id: new ObjectId(existingResume._id) },
        { $set: resume }
      );
      res.status(200).send(result);
    } else {
      const result = await resumeCollection.insertOne(resume);
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "An error occurred", error: err.message });
  }
});

//update resume template
app.patch("/api/v1/resume/:id/template", async (req, res) => {
  try {
    const id = req.params.id;
    const template = req.body;
    const result = await resumeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: template }
    );
    res.status(200).send(result);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: "An error occurred", error: error.message });
  }
});
// --------------------Cover Letter ---------------- //
//cover letter api
app.get("/api/v1/coverletter/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await coverLetterCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
// find all
app.get("/api/v1/all-coverletter/:email", async (req, res) => {
  try {
    const email = req.params.email
    const query = { userEmail: email }
    const result = await coverLetterCollection.find(query).toArray()
    res.send(result);
  }
  catch (error) {
    console.log(error)
  }
})
// cover letter post api

app.put("/api/v1/coverletter", async (req, res) => {
  try {
    const coverLetter = req.body;
    const query = { userEmail: coverLetter.userEmail };
    const existingCoverLetter = await coverLetterCollection.findOne(query);

    if (existingCoverLetter) {
      const result = await coverLetterCollection.updateOne(
        { _id: new ObjectId(existingCoverLetter._id) },
        { $set: coverLetter }
      );
      res.status(200).send(result);
    } else {
      const result = await coverLetterCollection.insertOne(coverLetter);
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "An error occurred", error: err.message });
  }
});

// --------------------Cv ------------------- //
// cv api
app.get("/api/v1/cv/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await cvCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
// find all
app.get("/api/v1/all-cv/:email", async (req, res) => {
  try {
    const email = req.params.email
    const query = { userEmail: email }
    const result = await cvCollection.find(query).toArray()
    res.send(result);
  }
  catch (error) {
    console.log(error)
  }
})
app.get("/api/v1/getcv/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cvCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
// cv post api
app.put("/api/v1/cv", async (req, res) => {
  try {
    const cv = req.body;
    const query = { userEmail: cv.userEmail };
    const queryObj = await cvCollection.findOne(query);
    const id = queryObj?._id;
    if (id) {
      const result = await cvCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: cv },
        { upsert: true }
      );
      res.status(200).send(result);
    } else {
      const result = await cvCollection.insertOne(cv);
      res.status(200).send(result);
    }
  } catch (err) {
    console.log(err);
  }
});

app.patch("/api/v1/cv/:id/template", async (req, res) => {
  try {
    const id = req.params.id;
    const template = req.body;
    const result = await cvCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: template }
    );
    res.status(200).send(result);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: "An error occurred", error: error.message });
  }
})

// ------------cient review----------------//
app.post('/api/v1/reviews', async (req, res) => {
  const review = req.body;
  const result = await UserReviewcollections.insertOne(review);
  res.send(result)

})

app.get('/api/v1/reviews', async (req, res) => {
  const cursor =  UserReviewcollections.find()
  const result = await cursor.toArray();
  res.send(result)
})






//  user comment

//Start server
app.get("/", (req, res) => {
  res.send("Hello from ResuMagnet Server.");
});

app.listen(port, () => {
  console.log(`ResuMagnet is running on port ${port}`);
});
