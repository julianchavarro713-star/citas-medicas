const mongoose = require("mongoose");

const CitaSchema = new mongoose.Schema({
  paciente: String,
  fecha: String,
  hora: String,
  doctor: String,
  centroMedico: String,
  motivo: String  
});

module.exports = mongoose.model("Cita", CitaSchema);