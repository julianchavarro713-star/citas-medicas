const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

const Cita = require("./models/Cita");
const Usuario = require("./models/Usuario");

const app = express();

// Configurar CORS correctamente
app.use(cors({
  origin: "https://grand-fenglisu-4c6a7c.netlify.app"
}));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/clinica";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.log("Error conectando a MongoDB:", err));

app.post("/usuarios", async (req, res) => {
  try {
    console.log("1. Recibida petición de registro");
    console.log("2. Contraseña original:", req.body.password);
    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log("3. Contraseña encriptada:", hashedPassword);
    
    const nuevoUsuario = new Usuario({
      nombre: req.body.nombre,
      correo: req.body.correo,
      password: hashedPassword,
      edad: req.body.edad,
      telefono: req.body.telefono,
      documento: req.body.documento,
      direccion: req.body.direccion,
      estatura: req.body.estatura,
      tipoSangre: req.body.tipoSangre
    });

    await nuevoUsuario.save();
    console.log("4. Usuario guardado correctamente");
    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ correo: req.body.correo });
    if (!usuario) {
      return res.status(401).json({ success: false, mensaje: "Credenciales incorrectas" });
    }
    
    const passwordValida = await bcrypt.compare(req.body.password, usuario.password);
    
    if (passwordValida) {
      res.json({ success: true, usuario: { nombre: usuario.nombre, correo: usuario.correo } });
    } else {
      res.status(401).json({ success: false, mensaje: "Credenciales incorrectas" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/usuarios", async (req, res) => {
  const usuarios = await Usuario.find();
  res.json(usuarios);
});

app.post("/citas", async (req, res) => {
  try {
    const nueva = new Cita(req.body);
    await nueva.save();
    res.status(201).json({ mensaje: "Cita creada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/citas", async (req, res) => {
  const citas = await Cita.find();
  res.json(citas);
});

app.delete("/citas/:id", async (req, res) => {
  await Cita.findByIdAndDelete(req.params.id);
  res.json({ mensaje: "Eliminada" });
});

app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});