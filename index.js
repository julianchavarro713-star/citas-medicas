const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const Cita = require("./models/Cita");
const Usuario = require("./models/Usuario");

const app = express();

app.use(cors({
  origin: "https://grand-fenglisu-4c6a7c.netlify.app"
}));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/clinica";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.log("Error conectando a MongoDB:", err));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sistema.notificaa@gmail.com",
    pass: "uqfycbyskrhzba"
  }
});

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

    const mailOptions = {
      from: "sistema.notificaa@gmail.com",
      to: req.body.correo,
      subject: "🎉 Bienvenido al Sistema de Citas Médicas",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h1 style="color: #4facfe;">¡Hola ${req.body.nombre}!</h1>
          <p>Tu cuenta ha sido <strong>creada exitosamente</strong> en el Sistema de Gestión de Citas Médicas.</p>
          <p>Ya puedes agendar tus citas médicas desde nuestra plataforma.</p>
          <p>🔗 Accede aquí: <a href="https://grand-fenglisu-4c6a7c.netlify.app/login.html">https://grand-fenglisu-4c6a7c.netlify.app</a></p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Si no solicitaste este registro, ignora este mensaje.</p>
          <p style="color: #666; font-size: 12px;">Saludos,<br>Equipo de la Clínica</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("❌ Error al enviar correo de bienvenida:", error);
      } else {
        console.log("✅ Correo de bienvenida enviado:", info.response);
      }
    });

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
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/citas", async (req, res) => {
  try {
    const nueva = new Cita(req.body);
    await nueva.save();
    console.log("Cita guardada correctamente");

    const paciente = await Usuario.findOne({ nombre: req.body.paciente });
    
    if (paciente && paciente.correo) {
      const mailOptions = {
        from: "sistema.notificaa@gmail.com",
        to: paciente.correo,
        subject: "✅ Confirmación de Cita Médica",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h1 style="color: #4facfe;">¡Cita Agendada con Éxito!</h1>
            <p>Hola <strong>${req.body.paciente}</strong>, tu cita ha sido agendada correctamente.</p>
            
            <h2>📋 Detalles de la Cita:</h2>
            <ul style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
              <li><strong>📅 Fecha:</strong> ${req.body.fecha}</li>
              <li><strong>⏰ Hora:</strong> ${req.body.hora}</li>
              <li><strong>👨‍⚕️ Doctor:</strong> ${req.body.doctor}</li>
              <li><strong>🏥 Centro Médico:</strong> ${req.body.centroMedico}</li>
            </ul>
            
            <p>Por favor, llega con 15 minutos de anticipación.</p>
            
            <p>🔗 Accede a tu cuenta: <a href="https://grand-fenglisu-4c6a7c.netlify.app/citas.html">https://grand-fenglisu-4c6a7c.netlify.app</a></p>
            
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Si no agendaste esta cita, por favor contacta al centro médico.</p>
            <p style="color: #666; font-size: 12px;">Saludos,<br>Equipo de la Clínica</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("❌ Error al enviar correo de cita:", error);
        } else {
          console.log("✅ Correo de cita enviado:", info.response);
        }
      });
    } else {
      console.log("⚠️ No se encontró el correo del paciente:", req.body.paciente);
    }

    res.status(201).json({ mensaje: "Cita creada" });
  } catch (error) {
    console.log("ERROR al crear cita:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/citas", async (req, res) => {
  try {
    const citas = await Cita.find();
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/citas/:id", async (req, res) => {
  try {
    await Cita.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/estadisticas", async (req, res) => {
  try {
    const totalCitas = await Cita.countDocuments();
    const totalUsuarios = await Usuario.countDocuments();
    const citasPorDoctor = await Cita.aggregate([
      { $group: { _id: "$doctor", count: { $sum: 1 } } }
    ]);
    
    res.json({
      totalCitas,
      totalUsuarios,
      citasPorDoctor
    });
  } catch (error) {
    console.error("Error en estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});