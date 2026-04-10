require("dotenv").config(); 
const express = require("express"); 
const mongoose = require("mongoose"); 
const cors = require("cors"); 
const authRoutes = require("./routers/authentication");
 
const app = express(); 
 
// Middleware 
app.use(cors());          // Permitir solicitudes CORS 
app.use(express.json());  // Permitir recibir datos JSON en el cuerpo de la solicitud 
 
// Conectar a MongoDB 
mongoose.connect(process.env.MONGO_URI) 

  .then(() => console.log("MongoDB conectado")) 
  .catch(err => console.error(err)); 
 
// Rutas 
app.use("/api/animals", require("./routes/animalRoutes")); 
app.use("/api", authRoutes)
 
// Ruta base 
app.get("/", (req, res) => { 
  res.send("API funcionando 🚀"); 
}); 
 
// Puerto de conexión 
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => { 
  console.log(`Servidor corriendo en el puerto ${PORT}`); 
}); 