function doGet(e) {
  var page = e.parameter.page;

  if (page === "PanelAdmin") {
    var t = HtmlService.createTemplateFromFile('PanelAdmin');
    return t.evaluate()
      .setTitle('Panel de Administrador')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (page === "PanelEmpleado") {
    var t = HtmlService.createTemplateFromFile('PanelEmpleado');
    t.usuario = e.parameter.usuario || "usuarioDesconocido";
    return t.evaluate()
      .setTitle('Panel de Empleado')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    var datos = SHEET_USUARIOS.getDataRange().getValues();
    var existeAdmin = datos.some(row => row[4] === "Administrador");
    if (existeAdmin) {
      return HtmlService.createHtmlOutputFromFile('Login')
        .setTitle('Inicio de Sesión')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } else {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Registro de Administrador')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
}

var SHEET_USUARIOS = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");

/**
 * Función para registrar el primer administrador
 */
function registrarPrimerAdmin(nombre, usuario, contraseña) {
  var datos = SHEET_USUARIOS.getDataRange().getValues();

  // Verifica si ya hay un administrador registrado
  var existeAdmin = datos.some(row => row[4] === "Administrador");

  if (existeAdmin) {
    return { success: false, message: "Ya existe un administrador registrado." };
  }

  // Agrega el primer administrador
  SHEET_USUARIOS.appendRow([Date.now(), nombre, usuario, contraseña, "Administrador", 0]);
  return { success: true, message: "Administrador registrado con éxito." };
}

function validarLogin(usuario, contraseña) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();
  var webAppUrl = ScriptApp.getService().getUrl(); // Obtiene la URL base de la app

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario && datos[i][3] === contraseña) {
      var rol = datos[i][4];
      if (rol === "Administrador") {
        return {
          success: true,
          message: "Ingreso exitoso como Administrador",
          redirect: webAppUrl + "?page=PanelAdmin"
        };
      } else if (rol === "Empleado") {
        // Se añade el parámetro "usuario" a la URL para identificar al empleado
        return {
          success: true,
          message: "Ingreso exitoso como Empleado",
          redirect: webAppUrl + "?page=PanelEmpleado&usuario=" + encodeURIComponent(usuario)
        };
      }
    }
  }
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

function mostrarLogin() {
  return HtmlService.createHtmlOutputFromFile('Login')
    .setTitle('Inicio de Sesión')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Obtiene la lista de empleados.
 * Retorna un arreglo de arreglos: [ID, Nombre, Usuario, Rol, Correo]
 */
function obtenerEmpleados() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();
  var empleados = [];
  // Se asume que la fila 1 es la cabecera
  for (var i = 1; i < datos.length; i++) {
    empleados.push({
      id: datos[i][0],
      nombre: datos[i][1],
      usuario: datos[i][2],
      rol: datos[i][4],
      correo: datos[i][7] ? datos[i][7] : ""
    });
  }
  return empleados;
}

/**
 * Registra un nuevo empleado (rol "Empleado").
 */
function registrarEmpleado(nombre, usuario, contrasena, correo, rol) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  // Se agrega el empleado con 8 columnas:
  // 1: ID, 2: Nombre, 3: Usuario, 4: Contraseña, 5: Rol,
  // 6: Horas Acumuladas (Extra) (inicialmente 0),
  // 7: Horas Normales (inicialmente 0),
  // 8: Correo (opcional)
  sheet.appendRow([Date.now(), nombre, usuario, contrasena, rol, 0, 0, correo || ""]);
  return { success: true, message: "Empleado registrado correctamente" };
}


/**
 * Edita los datos de un empleado.
 * Solo se actualiza la contraseña si se ingresa un valor (de lo contrario, se mantiene la anterior).
 */
function editarEmpleado(id, nombre, usuario, contrasena, correo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();

  // Se asume que el ID es único y se encuentra en la primera columna.
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      // Actualiza: Nombre (columna 2), Usuario (columna 3)
      sheet.getRange(i + 1, 2).setValue(nombre);
      sheet.getRange(i + 1, 3).setValue(usuario);
      // Actualiza la contraseña solo si se ingresó un valor (no vacío)
      if (contrasena && contrasena.trim() !== "") {
        sheet.getRange(i + 1, 4).setValue(contrasena);
      }
      // Actualiza Correo en la columna 8 (índice 7)
      sheet.getRange(i + 1, 8).setValue(correo);
      return { success: true, message: "Empleado actualizado correctamente" };
    }
  }
  return { success: false, message: "Empleado no encontrado" };
}

/**
 * Elimina a un empleado de la hoja.
 */
function eliminarEmpleado(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Empleado eliminado correctamente" };
    }
  }
  return { success: false, message: "Empleado no encontrado" };
}

/**
 * Registra la entrada de un empleado.
 * Se asume que "usuario" es el identificador único (login) del empleado.
 */
function registrarEntradaEmpleado(usuario) {
  var hojaAsistencia = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var fechaHoy = new Date();
  var fechaStr = Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // Verificar si ya existe registro de entrada hoy para este usuario
  var datos = hojaAsistencia.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario && datos[i][2] === fechaStr) {
      return { success: false, message: "Ya se registró la entrada hoy." };
    }
  }

  // Registrar entrada
  hojaAsistencia.appendRow([Date.now(), usuario, fechaStr, fechaHoy, "", 0]);
  return { success: true, message: "Entrada registrada a las " + Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "HH:mm:ss") };
}

// Registra la salida para el descanso
function registrarSalidaDescanso(usuario) {
  const hoja = SpreadsheetApp.getActive().getSheetByName("Asistencia");
  const fechaHoy = new Date();
  const fila = buscarRegistroActivo(usuario, hoja);

  if (!fila) return { success: false, message: "Primero registra tu entrada normal." };

  hoja.getRange(fila, 7).setValue(fechaHoy); // Columna 7: Hora Salida Descanso

  // Función formateadora dentro de la misma función
  const formatoHora = (date) => Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm:ss");

  return {
    success: true,
    message: `✅ Salida para descanso registrada a las ${formatoHora(fechaHoy)}`
  };
}

// Registra el reingreso después del descanso
function registrarEntradaDescanso(usuario) {
  try {
    // Validar configuración primero
    const config = obtenerConfiguracion(); 
    if (!config || isNaN(config.DuracionDescanso) || isNaN(config.ToleranciaRetraso)) {
      throw new Error("Configuración inválida. Verifica la hoja 'Configuracion'.");
    }

    const hoja = SpreadsheetApp.getActive().getSheetByName("Asistencia");
    if (!hoja) throw new Error("Hoja 'Asistencia' no encontrada.");

    // Buscar registro activo
    const fila = buscarRegistroActivo(usuario, hoja);
    if (!fila) return { 
      success: false, 
      message: "❌ Registro no encontrado. Debes registrar tu entrada primero." 
    };

    // Validar que exista salida para descanso
    const salidaDescanso = hoja.getRange(fila, 7).getValue();
    if (!salidaDescanso) {
      return { 
        success: false, 
        message: "⚠️ Primero debes registrar tu <strong>Salida para Descanso</strong>." 
      };
    }

    // Calcular retraso y actualizar
    const entradaDescanso = new Date();
    const minutosRetraso = calcularRetraso(
      salidaDescanso,
      entradaDescanso,
      parseInt(config.DuracionDescanso) || 60, // Default 60 min
      parseInt(config.ToleranciaRetraso) || 5   // Default 5 min
    );

    // Guardar en hoja
    hoja.getRange(fila, 8).setValue(entradaDescanso); // Columna Hora Entrada Descanso
    hoja.getRange(fila, 9).setValue(minutosRetraso);  // Columna Minutos Retraso

    // Mensaje detallado con HTML
    const mensaje = minutosRetraso > 0 ?
      `<div class="text-start">
        <strong>⚠️ Reingreso con retraso:</strong>
        <ul class="mt-2">
          <li>Retraso: ${minutosRetraso} minutos</li>
          <li>Se descontarán de tus horas extras acumuladas</li>
        </ul>
       </div>` :
      "✅ Reingreso registrado <strong>a tiempo</strong>";

    return { success: true, message: mensaje };

  } catch (e) {
    return { 
      success: false, 
      message: `⛔ Error crítico: ${e.message} <br><small>Contacta al administrador</small>` 
    };
  }
}

function registrarSalidaEmpleado(usuario) {
  const hojaAsistencia = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  const config = obtenerConfiguracion(); // Obtener configuración
  const fechaHoy = new Date();

  // Buscar registro activo
  const fila = buscarRegistroActivo(usuario, hojaAsistencia);
  if (!fila) return {
    success: false,
    message: "⚠️ Registro no encontrado o salida ya registrada."
  };

  // Obtener tiempos clave
  const entrada = hojaAsistencia.getRange(fila, 4).getValue();
  const salidaDescanso = hojaAsistencia.getRange(fila, 7).getValue();
  const entradaDescanso = hojaAsistencia.getRange(fila, 8).getValue();
  const minutosRetraso = hojaAsistencia.getRange(fila, 9).getValue() || 0;

  // Validar registro completo
  if (!salidaDescanso || !entradaDescanso) {
    return {
      success: false,
      message: "❌ Debes registrar salida y reingreso del descanso primero."
    };
  }

  // Cálculo de horas
  const horasManana = (salidaDescanso - entrada) / 3.6e6; // Horas antes del descanso
  const horasTarde = (fechaHoy - entradaDescanso) / 3.6e6; // Horas después del descanso
  let horasTotales = horasManana + horasTarde;

  // Ajustar por retrasos
  const horasRetraso = minutosRetraso / 60;
  let horasExtras = Math.max(horasTotales - 8 - horasRetraso, 0);
  horasExtras = Math.round(horasExtras * 100) / 100; // Redondear a 2 decimales

  // Actualizar hoja Asistencia
  hojaAsistencia.getRange(fila, 5).setValue(fechaHoy); // Hora Salida Final
  hojaAsistencia.getRange(fila, 6).setValue(horasTotales.toFixed(2));

  // Actualizar acumulados en Usuarios
  const hojaUsuarios = SpreadsheetApp.getActive().getSheetByName("Usuarios");
  const datosUsuarios = hojaUsuarios.getDataRange().getValues();
  for (let j = 1; j < datosUsuarios.length; j++) {
    if (datosUsuarios[j][2] === usuario) {
      const nuevoExtra = (parseFloat(datosUsuarios[j][5]) || 0) + horasExtras;
      hojaUsuarios.getRange(j + 1, 6).setValue(nuevoExtra); // Columna Horas Extra
      break;
    }
  }

  // Formatear mensaje
  function formatoHora(decimal) {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
  }

  return {
    success: true,
    message: `
    <div class="text-start">
      <div class="alert alert-success mb-3">✅ Jornada completada</div>
      
      <ul class="list-group">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          Horas trabajadas
          <span class="badge bg-primary rounded-pill">${formatoHora(horasTotales)}</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
          Retraso en descanso
          <span class="badge bg-danger rounded-pill">${minutosRetraso} min</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
          Horas extras netas
          <span class="badge bg-warning rounded-pill">${formatoHora(horasExtras)}</span>
        </li>
      </ul>
    </div>
    `
  };
}

/************************************
 *        FUNCIONES AUXILIARES      *
 ************************************/

// Busca el registro activo del usuario (sin salida final)
function buscarRegistroActivo(usuario, hoja) {
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario && !datos[i][4]) { // Columna 5 vacía (sin salida final)
      return i + 1;
    }
  }
  return null;
}

// Obtiene parámetros de configuración desde la hoja
function obtenerConfiguracion() {
  const hoja = SpreadsheetApp.getActive().getSheetByName("Configuracion");
  if (!hoja) throw new Error("❌ Hoja 'Configuracion' no encontrada. Crea una con los parámetros.");

  const datos = hoja.getDataRange().getValues();

  // Validar estructura básica
  if (datos.length < 3 || !datos[1][1] || !datos[2][1]) {
    throw new Error("Formato incorrecto en hoja Configuracion. Usa la estructura: | Parámetro | Valor |");
  }

  return {
    DuracionDescanso: parseInt(datos[1][1]) || 60, // Fila 2, Columna B
    ToleranciaRetraso: parseInt(datos[2][1]) || 5   // Fila 3, Columna B
  };
}

// Calcula minutos de retraso después del descanso
function calcularRetraso(salidaDescanso, entradaDescanso, duracionDescanso, tolerancia) {
  const tiempoEsperado = new Date(salidaDescanso.getTime() + (duracionDescanso + tolerancia) * 60000);
  return entradaDescanso > tiempoEsperado ?
    Math.round((entradaDescanso - tiempoEsperado) / 60000) : 0;
}

/**
 * Registra la salida de un empleado (incluyendo descansos y retrasos).
 */

/**
 * Consulta las horas acumuladas de un empleado.
 */
function consultarHorasAcumuladas(usuario) {
  var hojaUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hojaUsuarios.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario) {
      var valor = datos[i][5];  // Valor de Horas Acumuladas
      var horas;

      // Si ya es un número, úsalo directamente
      if (typeof valor === "number") {
        horas = valor;
      } else {
        // Si es una cadena, reemplaza la coma por punto y conviértelo a número
        horas = parseFloat(valor.toString().replace(",", "."));
      }

      // En caso de que horas resulte NaN, asignar 0
      if (isNaN(horas)) {
        horas = 0;
      }

      return { success: true, horas: horas };
    }
  }
  return { success: false, message: "Empleado no encontrado." };
}

function consultarTotalHorasSemanal(usuario) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();

  var today = new Date();
  var dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  // Si la semana inicia en lunes, tratamos el domingo (0) como 7
  if (dayOfWeek === 0) {
    dayOfWeek = 7;
  }

  // Calcular el lunes de la semana actual
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Calcular el domingo de la semana actual
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  var totalHoras = 0;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario) {  // columna 2: Usuario
      var fechaRegistro = new Date(datos[i][2]); // columna 3: Fecha
      if (fechaRegistro >= monday && fechaRegistro <= sunday) {
        var horasTrabajadas = parseFloat(datos[i][5]) || 0; // columna 6: Horas Trabajadas
        totalHoras += horasTrabajadas;
      }
    }
  }
  totalHoras = Math.round(totalHoras * 100) / 100; // redondeo a 2 decimales
  return { success: true, totalHoras: totalHoras };
}

function convertirDecimalAHorasMinutos(decimalHoras) {
  var horas = Math.floor(decimalHoras);
  var minutos = Math.round((decimalHoras - horas) * 60);
  return horas + " horas y " + minutos + " minutos";
}


/**
 * Permite al empleado solicitar descanso usando horas acumuladas.
 */
function solicitarDescanso(usuario, horasSolicitadas, diaDescanso, motivo) {
  var hojaUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hojaUsuarios.getDataRange().getValues();
  var saldoExtra = 0;

  // Buscar al empleado y obtener el saldo de horas extras (asumiendo columna 6: Horas Acumuladas Extra)
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario) {
      saldoExtra = parseFloat(datos[i][5]) || 0;  // columna 6: índice 5
      break;
    }
  }

  if (horasSolicitadas > saldoExtra) {
    return { success: false, message: "No tienes suficientes horas extras para solicitar ese descanso." };
  }

  // Registrar la solicitud en la hoja "Solicitudes"
  var hojaSolicitudes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes");
  // Se asume que la hoja "Solicitudes" tiene: [ID, Usuario, Fecha de Solicitud, Día de Descanso, Horas Solicitadas, Motivo, Estado, Nota Rechazo]
  hojaSolicitudes.appendRow([Date.now(), usuario, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"), diaDescanso, horasSolicitadas, motivo, "Pendiente", ""]);
  return { success: true, message: "Solicitud de descanso registrada y pendiente de aprobación." };
}


function obtenerReporteAsistenciaAdmin() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  var reporte = [];

  // Suponemos que la fila 1 es la cabecera
  for (var i = 1; i < datos.length; i++) {
    // Datos: 
    // [0] ID, [1] Usuario, [2] Fecha, [3] Hora Entrada, [4] Hora Salida, [5] Horas Trabajadas
    var fecha = Utilities.formatDate(new Date(datos[i][2]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var horaEntrada = datos[i][3] ? Utilities.formatDate(new Date(datos[i][3]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
    var horaSalida = datos[i][4] ? Utilities.formatDate(new Date(datos[i][4]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
    reporte.push({
      usuario: datos[i][1],
      fecha: fecha,
      horaEntrada: horaEntrada,
      horaSalida: horaSalida,
      totalHoras: datos[i][5]
    });
  }

  return reporte;
}

function obtenerResumenSemanalAdmin() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  // Estructura: [0]ID, [1]Usuario, [2]Fecha, [3]Hora Entrada, [4]Hora Salida, [5]Horas Trabajadas

  var resumen = {}; // clave: usuario + "_" + lunesDeEsaSemana

  for (var i = 1; i < datos.length; i++) {
    var usuario = datos[i][1];
    if (!usuario) continue; // Evitar filas vacías

    // Convertir la fecha
    var fechaRegistro = new Date(datos[i][2]);
    if (isNaN(fechaRegistro.getTime())) continue; // Si es inválida, salta

    // Determinar el lunes de la semana (lunes a domingo)
    var day = fechaRegistro.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
    if (day === 0) day = 7; // Tratar domingo como 7
    var monday = new Date(fechaRegistro);
    monday.setDate(fechaRegistro.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    // Crear la clave para agrupar: "usuario_YYYY-MM-DD"
    var key = usuario + "_" + Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd");

    // Inicializar el objeto si no existe
    if (!resumen[key]) {
      resumen[key] = {
        usuario: usuario,
        // semana: fecha del lunes en formato YYYY-MM-DD
        semana: Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        totalHoras: 0,
        horasNormales: 0,
        horasExtra: 0
      };
    }

    // Horas trabajadas en ese día
    var horasTrabajadas = parseFloat(datos[i][5]) || 0;

    // Calcular horas normales y extras para ese día
    var dailyNorm = Math.min(8, horasTrabajadas);    // Máximo 8 horas normales al día
    var dailyExtra = Math.max(0, horasTrabajadas - 8); // Lo que exceda de 8h es extra

    // Sumar al acumulado semanal
    resumen[key].totalHoras += horasTrabajadas;
    resumen[key].horasNormales += dailyNorm;
    resumen[key].horasExtra += dailyExtra;
  }

  // Convertir el objeto 'resumen' en un arreglo
  var arrayResumen = [];
  for (var key in resumen) {
    // Redondear a 2 decimales
    resumen[key].totalHoras = Math.round(resumen[key].totalHoras * 100) / 100;
    resumen[key].horasNormales = Math.round(resumen[key].horasNormales * 100) / 100;
    resumen[key].horasExtra = Math.round(resumen[key].horasExtra * 100) / 100;
    arrayResumen.push(resumen[key]);
  }

  return arrayResumen;
}


// Retorna un arreglo de objetos {id, nombre} para listar empleados en "Reporte Detallado".
function obtenerListaEmpleados() {
  var ss = SpreadsheetApp.openById("1HUqUOlDQB20gfkUL6iDlmkD5eDy0ob_EyRHlqH4dklY"); // Reemplaza con el ID real
  var hoja = ss.getSheetByName("Usuarios");
  if (!hoja) {
    Logger.log("No se encontró la hoja 'Usuarios'.");
    return [];
  }
  var datos = hoja.getDataRange().getValues();
  Logger.log("Datos leídos: " + JSON.stringify(datos));

  var empleados = [];
  for (var i = 1; i < datos.length; i++) {
    var id = datos[i][0] ? datos[i][0].toString() : "Sin ID";
    var nombre = datos[i][1] ? datos[i][1].toString() : "Sin Nombre";
    var usuario = datos[i][2] ? datos[i][2].toString() : "Sin Usuario";
    var rol = datos[i][4] ? datos[i][4].toString() : "Sin Rol";
    var correo = datos[i][7] ? datos[i][7].toString() : "Sin Correo";

    empleados.push({ id, nombre, usuario, rol, correo });
  }

  Logger.log("Empleados obtenidos: " + JSON.stringify(empleados));
  return empleados;
}


// Dado un ID, retorna el usuario (login) de la columna 3 en la hoja "Usuarios".
function obtenerUsuarioPorId(id) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      return datos[i][2]; // Usuario (columna 3)
    }
  }
  return null;
}

// Retorna los registros de asistencia del empleado, agrupados por semanas (lunes a domingo).
function obtenerReporteEmpleado(empleadoId) {
  var usuario = obtenerUsuarioPorId(empleadoId);
  if (!usuario) {
    return [];
  }

  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  var registrosEmpleado = [];

  // Se asume que la fila 1 es cabecera: 
  // Columna 2: Usuario, Columna 3: Fecha, Columna 4: Hora Entrada, Columna 5: Hora Salida, Columna 6: Total Horas
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario) {
      var dateObj = new Date(datos[i][2]);
      var fechaFormatted = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      var dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      var diaSemana = dias[dateObj.getDay()];
      var fecha = fechaFormatted + " (" + diaSemana + ")";

      var horaEntrada = datos[i][3] ? Utilities.formatDate(new Date(datos[i][3]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
      var horaSalida = datos[i][4] ? Utilities.formatDate(new Date(datos[i][4]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
      var totalHoras = datos[i][5];

      registrosEmpleado.push({
        fecha: fecha,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        totalHoras: totalHoras
      });
    }
  }

  // El resto de la función: agrupar por semana, etc. (se mantiene igual)
  // Agrupar por semana (lunes a domingo) usando la fecha forzada a mediodía
  var grupos = {};
  registrosEmpleado.forEach(function (reg) {
    // Extrae la parte de la fecha (ejemplo: "2025-03-17") y fuerza la hora a mediodía para evitar desfases de zona horaria
    var dateStr = reg.fecha.split(" ")[0]; // Toma la parte "yyyy-MM-dd"
    var dateObj = new Date(dateStr + "T12:00:00"); // Forza la hora a mediodía

    var day = dateObj.getDay();
    if (day === 0) day = 7; // Tratar el domingo como 7
    var monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    var fechaInicio = Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd");

    var domingo = new Date(monday);
    domingo.setDate(monday.getDate() + 6);
    var fechaFin = Utilities.formatDate(domingo, Session.getScriptTimeZone(), "yyyy-MM-dd");

    var key = fechaInicio + " - " + fechaFin;
    if (!grupos[key]) {
      grupos[key] = { fechaInicio: fechaInicio, fechaFin: fechaFin, registros: [] };
    }
    grupos[key].registros.push(reg);
  });

  var resultado = [];
  for (var key in grupos) {
    resultado.push(grupos[key]);
  }
  resultado.sort(function (a, b) {
    return new Date(b.fechaInicio) - new Date(a.fechaInicio);
  });

  return resultado;
}

// Código Corregido en tu .gs
function obtenerSolicitudesDescanso() {
  try {
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hojaSolicitudes = libro.getSheetByName("Solicitudes");

    if (!hojaSolicitudes) {
      console.error("Hoja 'Solicitudes' no encontrada");
      return [];
    }

    const datos = hojaSolicitudes.getDataRange().getValues();
    const solicitudes = [];
    const encabezados = datos[0];
    const indiceEstado = encabezados.indexOf("Estado"); // Columna "Estado"

    // Validar columna "Estado"
    if (indiceEstado === -1) {
      console.error("Columna 'Estado' no encontrada");
      return [];
    }

    // Procesar filas
    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (!fila || fila.length < 8) continue;

      // Convertir fechas a formato dd/MM/yyyy
      const fechaSolicitud = Utilities.formatDate(new Date(fila[2]), "GMT-6", "dd/MM/yyyy");
      const diaDescanso = Utilities.formatDate(new Date(fila[3]), "GMT-6", "dd/MM/yyyy");

      // Validar estado
      const estado = fila[indiceEstado].toString().trim().toLowerCase();
      if (estado === "pendiente") {
        solicitudes.push({
          id: fila[0],
          empleado: fila[1],
          fechaSolicitud: fechaSolicitud, // Fecha formateada
          diaDescanso: diaDescanso,       // Fecha formateada
          horas: parseFloat(fila[4]) || 0,
          motivo: fila[5]
        });
      }
    }

    return solicitudes;

  } catch (e) {
    console.error("Error crítico:", e);
    return [];
  }
}

function aprobarSolicitud(id, horasSolicitadas, empleado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSolicitudes = ss.getSheetByName("Solicitudes");
    const sheetUsuarios = ss.getSheetByName("Usuarios");

    // Buscar la solicitud
    const datosSolicitudes = sheetSolicitudes.getDataRange().getValues();
    let filaSolicitud = -1;
    for (let i = 1; i < datosSolicitudes.length; i++) {
      if (datosSolicitudes[i][0].toString() === id.toString()) {
        filaSolicitud = i + 1;
        break;
      }
    }

    if (filaSolicitud === -1) {
      return { success: false, message: "Solicitud no encontrada." };
    }

    // Buscar al empleado en "Usuarios"
    const datosUsuarios = sheetUsuarios.getDataRange().getValues();
    let filaEmpleado = -1;
    let horasExtraActuales = 0;
    for (let j = 1; j < datosUsuarios.length; j++) {
      if (datosUsuarios[j][2] === empleado) { // Columna 3: Usuario
        filaEmpleado = j + 1;
        horasExtraActuales = parseFloat(datosUsuarios[j][5]) || 0; // Columna 6: Horas Extra
        break;
      }
    }

    if (filaEmpleado === -1) {
      return { success: false, message: "Empleado no encontrado." };
    }

    // Validar horas disponibles
    if (horasExtraActuales < horasSolicitadas) {
      return {
        success: false,
        message: `El empleado solo tiene ${horasExtraActuales} horas extra. No puede descontar ${horasSolicitadas}.`
      };
    }

    // Actualizar horas extras del empleado
    const nuevasHoras = horasExtraActuales - horasSolicitadas;
    sheetUsuarios.getRange(filaEmpleado, 6).setValue(nuevasHoras); // Columna 6: Horas Extra

    // Marcar solicitud como aprobada
    sheetSolicitudes.getRange(filaSolicitud, 7).setValue("Aprobada"); // Columna 7: Estado

    return {
      success: true,
      message: `Solicitud aprobada. Nuevo saldo: ${nuevasHoras} horas extra.`
    };

  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

function rechazarSolicitud(id, empleado, notaRechazo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSolicitudes = ss.getSheetByName("Solicitudes");

    if (!sheetSolicitudes) {
      return { success: false, message: "Hoja 'Solicitudes' no encontrada" }; // <-- Validar existencia
    }

    const datos = sheetSolicitudes.getDataRange().getValues();
    let filaEncontrada = -1;

    // Buscar la solicitud por ID
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0].toString() === id.toString()) {
        filaEncontrada = i;
        break;
      }
    }

    if (filaEncontrada === -1) {
      return { success: false, message: "Solicitud no encontrada" }; // <-- Respuesta estructurada
    }

    // Actualizar estado y nota de rechazo
    sheetSolicitudes.getRange(filaEncontrada + 1, 7).setValue("Rechazada"); // Columna G: Estado
    sheetSolicitudes.getRange(filaEncontrada + 1, 8).setValue(notaRechazo);  // Columna H: Nota Rechazo

    return { success: true, message: "Solicitud rechazada correctamente" };

  } catch (e) {
    console.error("Error al rechazar solicitud:", e);
    return { success: false, message: "Error interno: " + e.message }; // <-- Nunca retornar null
  }
}

function obtenerSolicitudesEmpleado(usuario) {
  try {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes");
    const datos = hoja.getDataRange().getValues();
    const encabezados = datos[0];

    // Índices de columnas (actualiza según tu estructura)
    const INDICE_ESTADO = encabezados.indexOf("Estado");
    const INDICE_LEIDO = encabezados.indexOf("Leído"); // Nueva columna

    const solicitudes = {
      aprobadas: [],
      rechazadas: [],
      noLeidas: [] // Nuevas notificaciones no vistas
    };

    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (fila[1] === usuario) {
        const estado = fila[INDICE_ESTADO].toString().trim().toLowerCase();
        const leido = fila[INDICE_LEIDO]?.toString().trim().toLowerCase() === "sí";

        const solicitud = {
          id: fila[0],
          fecha: Utilities.formatDate(new Date(fila[2]), "GMT-6", "dd/MM/yyyy"),
          estado: estado,
          horas: fila[4],
          motivo: fila[5],
          nota: fila[7] || "",
          leido: leido
        };

        // Clasificar
        if (estado === "aprobada") solicitudes.aprobadas.push(solicitud);
        else if (estado === "rechazada") solicitudes.rechazadas.push(solicitud);

        // Notificaciones no leídas
        if (!leido) solicitudes.noLeidas.push(solicitud);
      }
    }

    return { success: true, ...solicitudes };

  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

// ====== FUNCIÓN PARA MARCAR NOTIFICACIONES ======
function marcarComoLeido(idSolicitud) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes");
  const datos = hoja.getDataRange().getValues();
  const indiceLeido = datos[0].indexOf("Leído"); // Asume que la columna 9 es "Leído"

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] == idSolicitud) {
      hoja.getRange(i + 1, indiceLeido + 1).setValue("Sí"); // Marcar como leído
      break;
    }
  }
}
