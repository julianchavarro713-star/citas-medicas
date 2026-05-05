const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nombre: String,
  correo: String,
  password: String,
  edad: Number,
  telefono: String,
  documento: String,
  direccion: String,
  estatura: Number,
  tipoSangre: String
});

module.exports = mongoose.model("Usuario", UsuarioSchema);