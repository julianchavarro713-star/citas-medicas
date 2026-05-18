const mongoose = require("mongoose");

const CitaSchema = new mongoose.Schema({
  paciente: String,
  fecha: String,
  hora: String,
  doctor: String,
  centroMedico: String,
  motivo: String,
  estado: { type: String, default: "pendiente" },
  multa: { type: Number, default: 0 }
});

module.exports = mongoose.model("Cita", CitaSchema);