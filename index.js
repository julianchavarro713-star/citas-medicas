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

// ==================== REGISTRO DE USUARIOS ====================
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
      tipoSangre: req.body.tipoSangre,
      preguntaSeguridad: req.body.preguntaSeguridad,
      respuestaSeguridad: req.body.respuestaSeguridad
    });

    await nuevoUsuario.save();
    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ACTUALIZAR USUARIO (para recuperar contraseña) ====================
app.put("/usuarios/:id", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.params.id,
      { ...req.body, password: hashedPassword },
      { new: true }
    );
    res.json({ mensaje: "Contraseña actualizada exitosamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOGIN ====================
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
    console.error("Error en login:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== OBTENER USUARIOS ====================
app.get("/usuarios", async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CREAR CITA CON VALIDACIÓN ====================
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

// ==================== OBTENER CITAS ====================
app.get("/citas", async (req, res) => {
  try {
    const citas = await Cita.find();
    res.json(citas);
  } catch (error) {
    console.error("Error al obtener citas:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CANCELAR CITA CON VALIDACIÓN DE TIEMPO ====================
app.delete("/citas/:id", async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id);
    
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    
    if (cita.estado === "cancelada") {
      return res.status(400).json({ error: "Esta cita ya fue cancelada" });
    }
    
    if (cita.estado === "no_asistio") {
      return res.status(400).json({ error: "No se puede cancelar una cita donde el paciente no asistió" });
    }
    
    const fechaHoraCita = new Date(`${cita.fecha}T${cita.hora}`);
    const ahora = new Date();
    const diffHoras = (fechaHoraCita - ahora) / (1000 * 60 * 60);
    
    if (diffHoras < 1 && diffHoras > 0) {
      return res.status(400).json({ 
        error: "❌ No puedes cancelar la cita porque falta menos de 1 hora. Si no asistes, se generará una multa." 
      });
    }
    
    if (diffHoras < 0) {
      return res.status(400).json({ 
        error: "❌ No puedes cancelar una cita que ya pasó." 
      });
    }
    
    cita.estado = "cancelada";
    await cita.save();
    
    res.json({ mensaje: "Cita cancelada exitosamente" });
  } catch (error) {
    console.error("Error al cancelar cita:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MARCAR CITA COMO NO ASISTIÓ (solo admin) ====================
app.put("/citas/:id/no-asistio", async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id);
    
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    
    const fechaHoraCita = new Date(`${cita.fecha}T${cita.hora}`);
    const ahora = new Date();
    
    if (fechaHoraCita > ahora) {
      return res.status(400).json({ 
        error: "⚠️ No se puede registrar la inasistencia. La cita aún no ha ocurrido (está programada para una fecha futura). Solo se pueden marcar como 'No asistió' las citas con fecha y hora ya pasadas." 
      });
    }
    
    if (cita.estado === "cancelada") {
      return res.status(400).json({ error: "Esta cita ya fue cancelada" });
    }
    
    if (cita.estado === "no_asistio") {
      return res.status(400).json({ error: "Esta cita ya fue marcada como no asistido" });
    }
    
    cita.estado = "no_asistio";
    cita.multa = 50000;
    await cita.save();
    
    res.json({ mensaje: "✅ Cita marcada como no asistido. Multa generada: $50,000" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ESTADÍSTICAS ====================
app.get("/estadisticas", async (req, res) => {
  try {
    const totalCitas = await Cita.countDocuments();
    const totalUsuarios = await Usuario.countDocuments();
    const citasPorDoctor = await Cita.aggregate([
      { $group: { _id: "$doctor", count: { $sum: 1 } } }
    ]);
    
    res.json({ totalCitas, totalUsuarios, citasPorDoctor });
  } catch (error) {
    console.error("Error en estadísticas:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});