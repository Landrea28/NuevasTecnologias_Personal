const mongoose = require("mongoose"); 
 
// Esquema del Animal 
const animalSchema = new mongoose.Schema({ 
  nombre: { 
    type: String, 
    required: true 
  }, 
  edad: { 
    type: Number, 
    required: true 
  }, 
  tipo: { 
    type: String, 
    required: true 
  }, 
  fechaCreacion: { 
    type: Date, 
    default: Date.now  // La fecha se genera automáticamente al crear un nuevo documento 
  } 
}, { 
  timestamps: true // Mongoose genera automáticamente `createdAt` y `updatedAt` 
}); 
 
// Exportar el modelo Animal 
module.exports = mongoose.model("Animal", animalSchema); 