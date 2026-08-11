// Author: Angel Colman
/**
 * Carga los textos legales de la plataforma en PlatformSettings.
 *
 * Son borradores redactados para tener algo correcto y publicable desde el
 * primer día. Deben pasar por revisión de la empresa antes de abrir un juego
 * al público: comprometen a Automotor S.A. y a Carmotor S.A.
 *
 * Una vez cargados se editan desde el panel (Configuración), sin volver a
 * correr este script ni desplegar.
 *
 *   npx tsx prisma/seed-legales.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TERMINOS = `
## Bases y condiciones de Automotor Play

_Última actualización: agosto de 2026._

### 1. Qué es Automotor Play

Automotor Play es la plataforma de juegos y concursos de **Automotor S.A.** y
**Carmotor S.A.** Reúne distintos tipos de juego —trivias y juegos de
predicción, entre otros— en los que los participantes pueden competir por
premios.

Cada juego puede tener sus propias reglas de puntaje, fechas y premios, que se
muestran dentro del juego. Estas bases se aplican a todos ellos; en caso de
diferencia, prevalece lo indicado en el juego puntual.

### 2. Quiénes pueden participar

Pueden participar personas físicas mayores de 18 años, con documento de
identidad válido y residencia en la República del Paraguay.

No pueden participar los empleados de Automotor S.A. y Carmotor S.A., ni sus
cónyuges y familiares hasta el segundo grado de consanguinidad, ni el personal
de las empresas que intervienen en la organización de los juegos.

La participación es gratuita y no requiere ninguna compra.

### 3. Cómo se participa

Para jugar hay que crear una cuenta con datos personales reales y completos.
Los datos se usan para identificar a quien gane y poder entregarle el premio,
por lo que una cuenta con datos falsos o incompletos queda descalificada.

Cada persona puede tener **una sola cuenta**. Si se detectan varias cuentas
pertenecientes a la misma persona, se anulan todas sus participaciones.

La cuenta es personal e intransferible. Quien la crea es responsable de
mantener su contraseña en reserva y de la actividad realizada desde ella.

### 4. Cómo se juega

Cada juego indica en pantalla su mecánica, su puntaje y sus fechas.

En los juegos de predicción, cada pregunta tiene un **momento de cierre**
propio, que se muestra junto a ella. A partir de ese momento la elección queda
firme y no puede modificarse. La hora que vale es la del servidor de la
plataforma, expresada en hora de Asunción.

Si el evento sobre el que se predice se reprograma, se suspende o se cancela
—algo habitual en competencias deportivas—, la organización puede ajustar los
horarios de cierre, anular preguntas afectadas o recalcular puntajes.

### 5. Resultados y puntaje

Los resultados se cargan a partir de la información oficial del evento. Si esa
información se corrige después —por ejemplo, por una penalización aplicada
luego de finalizada una etapa—, los puntajes se recalculan y el resultado
corregido es el que vale.

El puntaje final de cada participante es la suma de los puntos obtenidos en
todas las preguntas del juego.

### 6. Cómo se determina quién gana

Gana quien obtenga el mayor puntaje total en el juego.

En caso de empate, se define en este orden:

1. Quien haya acertado más preguntas.
2. Quien haya cargado su primera predicción antes.

La organización anuncia los ganadores dentro de los quince (15) días corridos
de finalizado el juego, y los contacta por el correo o el teléfono registrados
en su cuenta.

### 7. Premios

Los premios de cada juego se muestran dentro del juego antes de participar.

Los premios **no son canjeables por dinero** ni transferibles a otra persona, y
se entregan a quien figure como titular de la cuenta ganadora, previa
acreditación de identidad con documento.

Quien gane tiene un plazo de **treinta (30) días corridos** desde que se lo
contacta para responder y coordinar la entrega. Pasado ese plazo sin respuesta,
pierde el derecho al premio, que puede asignarse al siguiente en la tabla o
declararse desierto.

Los impuestos, traslados o gastos que la entrega del premio genere y que no
estén expresamente incluidos quedan a cargo de quien gana.

### 8. Descalificación

La organización puede anular participaciones o dar de baja una cuenta, en
cualquier momento y sin aviso previo, cuando detecte datos falsos, cuentas
múltiples de una misma persona, uso de medios automatizados, intentos de
alterar el funcionamiento de la plataforma, o cualquier maniobra que vulnere el
espíritu de juego limpio de estas bases.

### 9. Cambios y suspensión

La organización puede modificar estas bases, así como suspender o dar por
finalizado un juego, cuando circunstancias ajenas a su voluntad lo justifiquen.
Los cambios se publican en esta misma página y rigen desde su publicación.

La plataforma se ofrece tal como está. La organización no garantiza que esté
disponible sin interrupciones y no se responsabiliza por fallas de conexión,
del dispositivo del participante o de terceros que impidan participar.

### 10. Datos personales

El tratamiento de los datos personales se rige por la
[Política de Privacidad](/privacidad), que forma parte de estas bases.

### 11. Consultas

Por cualquier consulta sobre estas bases o sobre un juego en particular, se
puede escribir a Automotor S.A. por los canales de contacto publicados en su
sitio institucional.

La participación implica el conocimiento y la aceptación total de estas bases.
`.trim()

const PRIVACIDAD = `
## Política de Privacidad

_Última actualización: agosto de 2026._

### 1. Quién trata tus datos

Los datos personales que dejás en Automotor Play son tratados por
**Automotor S.A.** y **Carmotor S.A.**, con domicilio en la República del
Paraguay, en calidad de responsables.

### 2. Qué datos recogemos

**Los que nos das al crear tu cuenta:** nombre y apellido, correo electrónico,
teléfono y número de cédula de identidad.

**Los que genera tu actividad:** las predicciones y respuestas que cargás, tus
puntajes, y las fechas en que jugaste.

**Los que registra el sistema por funcionamiento:** dirección IP y datos
técnicos del navegador, usados para prevenir abusos y limitar intentos
repetidos.

No pedimos ni almacenamos datos de tarjetas ni información bancaria, porque
participar es gratuito.

### 3. Para qué los usamos

- Crear y mantener tu cuenta, y permitirte iniciar sesión.
- Registrar tu participación y calcular tus puntajes.
- **Identificarte y contactarte si ganás un premio**, y poder entregártelo.
- Enviarte correos necesarios para el funcionamiento del servicio, como la
  confirmación de tu correo o la recuperación de tu contraseña.
- Cuidar la integridad del juego: detectar cuentas duplicadas, datos falsos o
  intentos de manipulación.

Pedimos la cédula porque un premio se entrega a una persona identificada. Si no
querés darla, no vas a poder participar por los premios.

### 4. Con qué base los tratamos

Tratamos tus datos con **tu consentimiento**, que das al crear la cuenta
aceptando estas condiciones, y porque son necesarios para poder darte el
servicio y cumplir con la entrega de premios.

Podés retirar tu consentimiento en cualquier momento pidiendo la baja de tu
cuenta. Eso implica dejar de participar en los juegos en curso.

### 5. Con quién los compartimos

No vendemos ni cedemos tus datos a terceros con fines comerciales.

Los compartimos únicamente con los proveedores que hacen funcionar la
plataforma, y solo en lo que cada uno necesita: el servicio de alojamiento del
sitio, el servicio de base de datos y el servidor de correo de Automotor
utilizado para los envíos.

También podríamos entregarlos si una autoridad competente lo requiere por una
vía legal válida.

### 6. Cuánto tiempo los guardamos

Conservamos los datos de tu cuenta mientras la mantengas activa.

Si pedís la baja, eliminamos tus datos personales dentro de los treinta (30)
días. Podemos conservar por más tiempo la información mínima necesaria para
acreditar la entrega de un premio, cuando una obligación legal o contable lo
exija.

### 7. Tus derechos

Podés, en cualquier momento:

- **Acceder** a los datos que tenemos sobre vos.
- **Corregirlos** si están equivocados o desactualizados. Los datos de tu
  cuenta los editás vos mismo desde *Mi cuenta*.
- **Pedir que los eliminemos** y que demos de baja tu cuenta.
- **Retirar tu consentimiento** para seguir tratándolos.

Para ejercer cualquiera de estos derechos, escribinos por los canales de
contacto publicados en el sitio institucional de Automotor S.A., desde el
correo con el que te registraste.

### 8. Seguridad

Tu contraseña se guarda cifrada y no puede ser leída, ni siquiera por nosotros.
El sitio funciona sobre conexión cifrada, y los enlaces de confirmación y de
recuperación vencen y sirven una sola vez.

Ningún sistema es infalible, pero trabajamos para proteger tu información y
para corregir cualquier problema que detectemos.

### 9. Cookies y sesión

Usamos una cookie técnica para mantener tu sesión iniciada y recordarte entre
visitas. Es necesaria para que la plataforma funcione y no se usa para
publicidad ni para seguirte por otros sitios.

### 10. Menores de edad

La plataforma está dirigida a mayores de 18 años. No recogemos datos de menores
de forma consciente. Si detectamos una cuenta de una persona menor de edad, la
damos de baja.

### 11. Cambios

Si modificamos esta política, publicamos la versión nueva en esta página con su
fecha de actualización. Cuando el cambio sea significativo, te lo avisamos por
correo.
`.trim()

async function main() {
  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: { platformTerms: TERMINOS, privacyPolicy: PRIVACIDAD },
    create: { id: 'singleton', platformTerms: TERMINOS, privacyPolicy: PRIVACIDAD },
    select: { platformTerms: true, privacyPolicy: true },
  })

  console.log('Bases y condiciones :', settings.platformTerms?.length, 'caracteres')
  console.log('Política de privacidad:', settings.privacyPolicy?.length, 'caracteres')
  console.log('\nEditables desde el panel, en Configuración.')
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
