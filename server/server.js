const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const CLIENT = "http://localhost:3000";
const MONGODB_ADDRESS = "mongodb+srv://USERNAME:PASSWORD@PATH.PATH.mongodb.net/test";

app.use(
  cors({
    origin: CLIENT,
    credentials: true,
  })
);

mongoose.set("strictQuery", false);
mongoose
  .connect(MONGODB_ADDRESS)
  .then(console.log("Connected to DataBase"))
  .catch((err) => console.log(err));

const SessionSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
  },
  userid: {
    type: String,
    required: true,
  },
});

const Session = mongoose.model("sessions", SessionSchema);

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("users", UserSchema);

app.listen(3002);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  if (req.header("cookies")) {
    req.cookies = parseCookies(req.header("cookies"));
  }

  if (!req.cookies || !req.cookies.connect_sid) return next();
  let sessionFromDB = await Session.findOne({ session_id: req.cookies.connect_sid });
  if (!sessionFromDB) return next();
  let userFromDB = await User.findOne({ _id: sessionFromDB.userid });
  if (!userFromDB) {
    await Session.deleteOne({ _id: sessionFromDB._id });
    return next();
  }
  userFromDB.password = undefined;
  userFromDB.salt = undefined;
  req.user = userFromDB;
  next();
});

app.post("/register", async (req, res) => {
  if (req.user) return res.sendStatus(401);
  if (!req.body.username) return res.send({ error: true, field: "username", message: "enter a username" });
  let user = await User.findOne({ username: req.body.username });
  if (user) return res.send({ error: true, field: "username", message: "username already exists" });
  if (!req.body.password) return res.send({ error: true, field: "password", message: "enter a password" });
  if (req.body.password.length < 4) return res.send({ error: true, field: "password", message: "password must be at least 4 characters" });

  let salt = bcrypt.genSaltSync(10);
  let newUser = await User.create({ username: req.body.username, password: hashPassword(req.body.password, salt), salt: salt });
  let session = newsession();
  res.cookie("connect_sid", session);
  await Session.create({ session_id: session, userid: newUser._id });
  res.send({ authenticated: true, session_id: session });
});

app.post("/logout", async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  let sessionFromDB = await Session.findOne({ session_id: req.cookies.connect_sid });
  req.user = undefined;
  if (sessionFromDB) await Session.deleteOne({ _id: sessionFromDB._id });
  req.user = undefined;
  res.send({ logout: true });
});

app.post("/login", async (req, res) => {
  if (req.user) return res.sendStatus(401);
  if (!req.body.username) return res.send({ error: true, field: "username", message: "enter a username" });
  let userFromDB = await User.findOne({ username: req.body.username });
  if (!userFromDB) return res.send({ error: true, field: "username", message: "username doesnt exists" });
  if (!req.body.password) return res.send({ error: true, field: "password", message: "enter a password" });
  if (!comparePassword(req.body.password, userFromDB.password, userFromDB.salt)) return res.send({ error: true, field: "password", message: "incorrect password" });
  let existedSession = await Session.findOne({ userid: userFromDB._id });
  if (existedSession) await Session.deleteOne({ _id: existedSession._id });

  let session = newsession();
  await Session.create({ session_id: session, userid: userFromDB._id });
  res.send({ authenticated: true, session_id: session });
});

app.get("/user", (req, res) => {
  res.send(req.user);
});

function newsession() {
  let result = "";
  const characters = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  for (let i = 0; i < characters.length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function hashPassword(password, salt) {
  const secretCode = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  const hashedPassword = bcrypt.hashSync(password + secretCode, salt);
  return hashedPassword;
}

function comparePassword(password, passwordFromDB, saltFromDB) {
  const secretCode = "j5d^zW8XvAa_LK?0kFyR>s`*iG}w)q3%[t@f{E!#o<2Q$6+SU1(4)p9]xO-cJrB&HNhMT^PbnYg7ClIeV}uZ)";
  const hashedPassword = bcrypt.hashSync(password + secretCode, saltFromDB);
  return hashedPassword == passwordFromDB;
}

function parseCookies(source) {
  const lines = source.trim().split("\n");
  const result = {};

  for (const line of lines) {
    const [key, value] = line.split("=");
    result[key] = value;
  }

  return result;
}
