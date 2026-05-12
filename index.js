const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

const Cita = require("./models/Cita");
const Usuario = require("./models/Usuario");

const app = express();

// Configurar CORS para permitir Vercel (frontend)
app.use(cors({
  origin: "https://citas-medicas-chi-lime.vercel.app"
}));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/clinica";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.log("Error conectando a MongoDB:", err));

app.post("/usuarios", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
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
    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
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
    console.log("📌 Datos recibidos en backend:", req.body);
    
    const { fecha, hora, doctor } = req.body;

    const citaExistente = await Cita.findOne({
      fecha: fecha,
      hora: hora,
      doctor: doctor
    });

    if (citaExistente) {
      return res.status(409).json({ 
        error: "❌ Horario no disponible. El doctor ya tiene una cita agendada en esa fecha y hora." 
      });
    }

    const nueva = new Cita({
      paciente: req.body.paciente,
      fecha: req.body.fecha,
      hora: req.body.hora,
      doctor: req.body.doctor,
      centroMedico: req.body.centroMedico,
      motivo: req.body.motivo || "Consulta general"
    });
    
    await nueva.save();
    console.log("✅ Cita guardada:", nueva);
    res.status(201).json({ mensaje: "✅ Cita agendada exitosamente", cita: nueva });
  } catch (error) {
    console.error("Error al crear cita:", error);
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

app.get("/estadisticas", async (req, res) => {
  try {
    const totalCitas = await Cita.countDocuments();
    const totalUsuarios = await Usuario.countDocuments();
    const citasPorDoctor = await Cita.aggregate([
      { $group: { _id: "$doctor", count: { $sum: 1 } } }
    ]);
    
    res.json({ totalCitas, totalUsuarios, citasPorDoctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});