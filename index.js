require("dotenv").config();
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { schema, root } = require("./graphql/schema");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// GraphQL endpoint
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected");

  // Example: Emit event to update data
  socket.on("updateData", () => {
    io.emit("dataUpdated");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
