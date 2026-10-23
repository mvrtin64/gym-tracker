# Reglas de dominio

Fuente de verdad de las reglas de entrenamiento de la app. Las define el coach; el código
(`packages/domain`) las implementa y los tests las fijan. Si una regla cambia, se cambia primero acá.

Estado de cada sección: **✅ implementado** · **🔜 definido, falta implementar** · **❓ pendiente de definir**

---

## 1. Principios

- **Una sola app para todos los niveles.** Sirve para anotar los entrenamientos de quien ya tiene su
  estructura y para guiar a quien arranca de cero.
- **No ser invasivos.** Al intermedio/avanzado no se le cambia su forma de entrenar: la app acompaña,
  registra y sugiere.
- **Individualidad.** Los valores iniciales son un punto de partida; el volumen se regula con lo que
  rinde cada persona.
- **Sobrecarga progresiva** como eje: todo lo demás (volumen, feedback) está para sostenerla.

## 2. Perfil y onboarding 🔜

Después del login se le pregunta al usuario:

| Pregunta | Principiante | Intermedio / Avanzado |
|---|---|---|
| Nivel | ✔ | ✔ |
| Días disponibles por semana (1 a 6) y **cuáles** (ej. lun, mar, jue, vie) | ✔ | ✔ |
| Enfoque | — (general) | ✔ |
| Músculos a priorizar (rezagados) | — | ✔ |
| Volumen con el que se maneja (series semanales) | — | ✔ |
| Rango de repeticiones con el que se siente cómodo | — | ✔ |

- **No se pregunta la duración de la sesión**: no es un parámetro útil (pocas series pueden llevar
  el mismo tiempo que muchas).
- **Enfoques**: general / completo · tren inferior y glúteos · tren superior · músculos específicos
  (el usuario elige cuáles).
- **El principiante no prioriza**: tiene que trabajar todo por igual. Su enfoque es siempre general y
  su semana sale de días armados (§3.5).

## 3. Rutinas

### 3.1 Origen ✅ (parcial) / 🔜

Una rutina es la plantilla de una sesión (ej. "Empuje", "Pierna"). Puede tener dos orígenes, pero
**es siempre el mismo objeto**: se anota, se progresa y se edita igual.

| Origen | Para quién | Ajustes |
|---|---|---|
| **Propia** (la carga el usuario) | Quien ya tiene su estructura | **Solo sugerencias**: la app nunca cambia nada sola |
| **Generada** (la arma la app) | Principiante o quien arranca de cero | **Automáticos**: la app ajusta series según el rendimiento |

El modo de ajuste es un dato de la rutina: tiene un valor por defecto según el origen y el usuario
lo puede cambiar (ej. un principiante que aprendió y pasa a "solo sugerencias").

El usuario **siempre** puede sumar o restar series; la lógica de sobrecarga se mantiene igual.
**La app sugiere, pero el usuario arma la rutina a su gusto**: desde el entrenamiento puede cambiar
las series de un ejercicio, cambiarlo por otro, sumar uno o quitarlo, y queda guardado en la rutina.

### 3.2 Generación de la semana 🔜

- El volumen semanal de cada músculo se **distribuye en los días disponibles**.
- **No hay tope de series por sesión.**
- Frecuencia ideal: **2 por semana** para todos los músculos; **hasta 3** para los músculos
  priorizados o chicos. Con 1 día disponible la frecuencia es 1 (full body).
- El reparto depende de **los días disponibles** y de **qué quiere priorizar** el usuario (más tren
  superior o más tren inferior): los grupos priorizados tienen más días y series que el resto.
- **Descanso**: un mismo grupo **no se entrena dos días seguidos**; lo ideal es un día de descanso en
  el medio. Por eso importa *qué* días entrena, no solo cuántos. Si con los días elegidos no se puede
  llegar a la frecuencia ideal sin días seguidos, se baja la frecuencia y se mantiene el volumen
  semanal repartido en menos días.

**División según los días** ✅ (definido por el coach, enfoque general):

| Días | División |
|---|---|
| 1–3 | Cuerpo completo |
| 4 | Empuje · tirón · piernas · descanso · cuerpo completo |
| 5 | Empuje · tirón · piernas · superior · inferior |
| 6 | Lo mismo + un día que se repite: cuerpo completo |

- Con un **tren priorizado** (intermedio / avanzado), los músculos priorizados van más días. Con 4
  días, al menos dos son para la prioridad: piernas y cuerpo completo para el inferior; empuje,
  tirón y cuerpo completo para el superior. Con 6, el día que se repite es el del tren priorizado
  (piernas o superior).
- Cada músculo va en los días de su grupo (nada de pecho el día de tirón). Empuje: pecho, deltoides
  anterior y lateral, tríceps. Tirón: dorsal, espalda alta, deltoides posterior, bíceps. Piernas:
  todo el tren inferior y abdominales.

### 3.3 Series y ejercicios dentro de una sesión 🔜

- Las series de un músculo en un día **no son un solo ejercicio**: se reparten en varios ejercicios
  con distintos ángulos. Ej. 6 series de glúteo = 3 de hip thrust + 3 de patada en polea.
- Aplica a todos los grupos.
- Base: **3 series por ejercicio** (entre 2 y 4). 5 series = 3 + 2; 6 series = 3 + 3.
- El día de énfasis de un músculo priorizado puede llevar más series (ej. 6 de glúteo = dos
  ejercicios de 3): no es mucho.
- **Series que sobran** al dividir el volumen entre días van al **día de énfasis** del músculo; si el
  reparto en 3 días queda forzado, se usa **frecuencia 2** directamente.

### 3.4 Selección de ejercicios en rutinas generadas ✅

El intermedio / avanzado normalmente arma sus propias rutinas. Cuando le pide a la app que se la
arme:

- **2 o 3 ejercicios por músculo** en la sesión, según las series que le tocan ese día (§3.3). Con
  pocas series (3 o menos), **un solo ejercicio**: el usuario siempre puede sumar series o ejercicios.
- **Primero multiarticulares, después aislamiento.**
- Cada ejercicio se puede **cambiar** por otro del catálogo o por uno **propio** que no esté cargado,
  por si no le gusta o no le resulta cómodo. Siempre aparecen variantes nuevas (face pull en polea,
  jalón unilateral, sentadilla hack…): el catálogo no intenta tenerlas todas, sino dejar cargarlas.
  Mientras tengan su progresión, funcionan igual que las del catálogo.
- Si un músculo se entrena **dos días**, la app pone los mismos ejercicios; **repetir o cambiar es a
  gusto del usuario**, que puede cambiar cualquiera por otro similar.
- **Pecho:** ejercicios con **leve inclinación**, para trabajar el pecho completo con énfasis en el
  pectoral superior. Ej.: press inclinado con mancuernas o con barra (a elección) + pec fly.

**Principiante:** ver §3.5.

**Orden por músculo** (validado por el coach; entran los primeros según la cantidad de ejercicios):

| Músculo | Multiarticular | Aislamiento |
|---|---|---|
| Pecho | Press inclinado con mancuernas · con barra | Pec deck · Aperturas en polea |
| Hombro frontal | Press militar | Elevaciones frontales |
| Hombro lateral | — | Elevaciones laterales · en polea |
| Hombro posterior | — | Pájaros · Face pull |
| Dorsal | Jalón al pecho o dominadas · Remo a una mano | Pullover en polea |
| Espalda alta | Remo con barra · Remo sentado en polea | Face pull |
| Bíceps | — | Curl con barra · Curl con mancuernas · Curl martillo |
| Tríceps | — | Extensión sobre la cabeza · Extensión en polea · Press francés |
| Cuádriceps | Sentadilla · Prensa | Extensión de cuádriceps |
| Femoral | Peso muerto rumano | Curl femoral sentado · acostado |
| Glúteo | Hip thrust · Sentadilla búlgara | Patada en polea · Abducción |
| Gemelos | — | Elevación de talones de pie · sentado |
| Abdominales | — | Crunch en polea · Elevación de piernas colgado |

### 3.5 Rutinas del principiante ✅

Definido por el coach: lo ideal para el principiante es **cuerpo completo**, un poco de todo repartido
en los días, **3–4 series por ejercicio** y **pocos ejercicios**. Hace multiarticulares que trabajan
varios músculos a la vez, así que **como mucho un aislamiento por músculo**. La app le arma las
rutinas sola al terminar el onboarding: no sabe armarlas.

La división es la de §3.2 (siempre con enfoque general). Los días de cuerpo completo rotan A → B → C:

| Día | Ejercicios |
|---|---|
| Cuerpo completo A | Sentadilla 4 · Press inclinado con mancuernas 4 · Jalón al pecho 4 · Elevaciones laterales 3 · Extensión de tríceps en polea 3 |
| Cuerpo completo B | Peso muerto rumano 4 · Press militar 4 · Remo con barra 4 · Curl con barra 3 · Elevación de talones de pie 3 |
| Cuerpo completo C | Prensa 4 · Press inclinado con barra 4 · Remo sentado en polea 4 · Hip thrust 3 · Crunch en polea 3 |
| Empuje | Press inclinado con mancuernas 4 · Press militar 4 · Pec deck 3 · Elevaciones laterales 3 · Extensión de tríceps en polea 3 |
| Tirón | Jalón al pecho 4 · Remo con barra 4 · Remo sentado en polea 3 · Face pull 3 · Curl con barra 3 |
| Piernas | Sentadilla 4 · Peso muerto rumano 4 · Hip thrust 3 · Elevación de talones de pie 3 · Crunch en polea 3 |
| Superior (5–6 días) | Press inclinado con barra 4 · Remo sentado en polea 4 · Jalón al pecho 3 · Elevaciones laterales 3 · Curl con mancuernas 3 · Extensión de tríceps sobre la cabeza 3 |
| Inferior (5–6 días) | Prensa 4 · Hip thrust 4 · Curl femoral sentado 3 · Extensión de cuádriceps 3 · Elevación de talones sentado 3 |

Superior: un press, un remo, un jalón, uno de laterales, uno de bíceps y uno de tríceps. Inferior: uno
de glúteo, uno de femoral, dos de cuádriceps y uno de gemelos. Son la base: como en cualquier rutina
generada, el usuario puede cambiar ejercicios o sumar series y ejercicios.

**Cuando mejora**: progresa en peso y reps como cualquiera (§6.1); la rutina no se agranda sola
(§5.4). Con el tiempo se le sugiere pasar a intermedio (§5.5).

## 4. Ejercicios

### 4.1 Músculo objetivo 🔜

- Cada ejercicio cuenta para **un único músculo objetivo** (salvo en el principiante, §5.1).
- El objetivo depende del **enfoque del ejercicio**: el hip thrust es de glúteo; la sentadilla
  búlgara puede ser de glúteo o de cuádriceps según la angulación, y eso **se especifica**.

**Deltoides anterior**: aunque el press lo trabaja de forma indirecta (y eso no cuenta), lleva un
**mínimo de 3 series directas** cada vez que se entrena; con frecuencia 2 son 6 semanales.

Músculos:

| Grupo | Músculos |
|---|---|
| Hombro | deltoides anterior · deltoides lateral · deltoides posterior |
| Torso | pecho · espalda alta · dorsales · abdominales |
| Brazo | bíceps · tríceps |
| Pierna | cuádriceps · isquios · glúteos · gemelos |

### 4.2 Tipo de ejercicio ✅

| Tipo | Ejemplos | Rango por defecto |
|---|---|---|
| **Multiarticular** (`compound`) | sentadilla, press, remo | 3 × 5–8, +2.5 kg |
| **Monoarticular** (`isolation`) | curl, extensiones, elevaciones | 3 × 10–15, +2 kg |

Al principiante se le aplican estos rangos; el intermedio/avanzado usa el rango que eligió.

### 4.3 Catálogo, técnica y anotaciones 🔜

- **Catálogo global** de ejercicios: nombre, tipo, músculo(s) objetivo posibles.
- Cada ejercicio del catálogo puede tener una **demostración** corta y un **tip de técnica** escrito
  por el coach (ej. dorsales: *"tirá desde el codo, no desde la mano, para sentir la contracción"*).
  Lo ven todos los usuarios.
- **Anotaciones del usuario por ejercicio**: datos fijos que no quiere olvidar (ángulo exacto del
  banco inclinado, alturas de la máquina, etc.). Son del usuario y del ejercicio en general:
  aparecen siempre que lo hace, en cualquier rutina.

## 5. Volumen semanal

### 5.1 Qué cuenta 🔜

- Solo cuentan las **series efectivas al músculo objetivo**.
- **No cuenta el volumen indirecto** de los multiarticulares (el press banca no suma a tríceps).
- **No cuentan las series de calentamiento.**
- Una serie con RIR alto **cuenta igual como efectiva** (ver §6.3).
- **Principiante: todo cuenta** ✅. Hace un multiarticular y lo siente en todos los músculos
  involucrados, así que cada serie cuenta completa para cada uno:

| Ejercicio | Cuenta para |
|---|---|
| Press inclinado con mancuernas / con barra | pecho · deltoides anterior · tríceps |
| Press militar | deltoides anterior · deltoides lateral · tríceps |
| Jalón al pecho / dominadas | dorsal · bíceps |
| Remo con barra / sentado en polea | espalda alta · dorsal · bíceps · deltoides posterior |
| Sentadilla / prensa | cuádriceps · glúteo |
| Peso muerto rumano | femoral · glúteo |
| Hip thrust | glúteo · femoral |

### 5.2 Volumen inicial

**Principiante** ✅ — su volumen semanal es **lo que suman sus días** (§3.5), contando cada
multiarticular para todos los músculos que trabaja (§5.1). Con 3 días, por ejemplo, el tríceps suma
15 series (press inclinado, press militar, extensión) y los gemelos 3. Si cambia la cantidad de días,
se recalcula.

**Intermedio / Avanzado** 🔜 — **no se impone un rango**. Se parte del volumen que el usuario dice
manejar (hay quien rinde con menos de 10 series semanales de pecho y quien necesita más; las dos
cosas están bien) y desde ahí se ajusta.

### 5.3 Ajuste de volumen ✅

El volumen se ajusta **por músculo**, deducido del **rendimiento** (no se le pregunta al usuario):

| Situación del músculo | Decisión |
|---|---|
| Progresa (sube reps o peso) con RIR 0–2 | El volumen está bien: no se toca |
| Se estanca o retrocede **2 sesiones seguidas** con RIR 0–2 | Le sobra volumen o no se recupera: **−1 a −2 series**, y se le pide **revisar** que esté llegando a un esfuerzo alto con la técnica adecuada |
| RIR alto sostenido | **No se suman series**: se le exige más esfuerzo (§6.3) |

En rutinas **propias** esto se muestra como sugerencia; en rutinas **generadas** se aplica solo.
La app no suma series por su cuenta: subir volumen es decisión del usuario.

**Estancamiento puntual vs. general:**

- Si se estanca **un grupo en particular** → se baja un poco el volumen semanal de ese grupo (tabla de arriba).
- Si el estancamiento es **general** (en casi todos los grupos no hay avance, o el rendimiento está
  igual: ni mejor ni peor) → se reevalúa y se hace una **semana de descarga**. "Casi todos" =
  **3 de cada 4 grupos sin avance en las últimas 2 semanas**.

  | Semana de descarga | Vuelta |
  |---|---|
  | **Mitad de series**, **mitad de peso**, **RIR 4–5** | Desde la semana siguiente se recupera el volumen **de a poco**: **+1 o 2 series por semana por grupo** hasta volver al que tenía, no todo de una |

La descarga de peso por ejercicio (§6.1) sigue funcionando aparte: es una corrección puntual de ese
ejercicio, no de la semana.

### 5.4 El principiante no suma series ✅

Definido por el coach: la **sobrecarga progresiva es subir el peso** (§6.1), no sumar series. Si
cada vez que progresa se le agregan series o ejercicios, con el tiempo la rutina queda enorme.

- La rutina base (§3.5) queda como está y progresa igual que la de cualquiera: reps y después peso.
- El feedback puede **bajar** volumen si no se recupera (§5.3).
- Si el usuario quiere, suma series o ejercicios a mano (§3.1).

### 5.5 Pasar a intermedio ✅

El principiante se forma en **3–6 meses**. A los **3 meses de su primera sesión** la app le
**sugiere** pasar a intermedio: desde ahí anota el esfuerzo con RPE, elige un enfoque y maneja su
volumen. Es solo una sugerencia: si dice "ahora no", se le vuelve a ofrecer en un mes. Detalles en §7.

## 6. Progresión y feedback

### 6.1 Doble progresión ✅

Es la progresión principal, para todos los niveles (definido por el coach): con el peso fijo se van
sumando reps dentro del rango que eligió el usuario; cuando **todas** las series llegan al límite
superior, en la próxima sesión se sube el peso (lo mínimo: el incremento del ejercicio, 2.5 kg por
defecto) y las reps vuelven a bajar. "Si llegó, llegó": no importa el esfuerzo con que llegó. En
ejercicios chicos (ej. laterales) lo ideal es sumar reps, pero si se puede subir el peso con técnica
impecable, se sube.

`computeNextTarget()` mira la última sesión del ejercicio:

| Situación en la última sesión | Decisión | Ejemplo (3×8–12, +2.5 kg) |
|---|---|---|
| Sin historial | `start` | peso inicial × 8 |
| **Todas** las series al máximo del rango (o más) | `increase_weight` | 3×12 @ 40 → **42.5 kg × 8** |
| Dentro del rango | `increase_reps` | 10, 9, 9 @ 40 → **40 kg × 10** |
| Alguna serie bajo el mínimo | `repeat` | 9, 8, 6 @ 40 → **40 kg × 8** |
| N fallos seguidos con el mismo peso | `deload` | 2 fallos @ 60 → **55 kg** (−10%) |

- Se sube el peso **solo si todas las series** llegan o pasan el máximo: si de tres series dos
  llegaron y la última no, **no se sube**.
- Bajar el peso no es por estancarse: solo cuando, por fatiga, ni siquiera llega al mínimo de reps
  (no debería pasar). Estancado dentro del rango, repite el peso hasta sumar reps.
- Las series de calentamiento no cuentan. Los pesos se redondean al incremento (discos disponibles).

### 6.2 Feedback por serie 🔜

Al anotar cada serie se pregunta, al lado, cómo se sintió. Con eso se estima un **RIR**
(repeticiones en reserva) interno.

**Principiante** — elige una sensación:

| Lo que ve | RIR estimado |
|---|---|
| "No podía hacer ni una más" | 0 |
| "Me quedaban 1 o 2" | 1–2 |
| "Me quedaban varias" | 3–4 |
| "Muy fácil, me sobraba mucho" | 5+ |

**Intermedio / Avanzado** — escribe el **RPE** percibido; `RIR = 10 − RPE`.

### 6.3 Uso del RIR 🔜

- **RIR 0–2** es la zona objetivo: ahí se incentiva la sobrecarga.
- **RIR alto** (ej. 4 en las primeras series de un principiante): se le **exige apretar más**, que
  se esfuerce en llegar al fallo. El principiante no va a fallar de verdad, pero así se acerca a un
  RIR 1. La serie **cuenta igual como efectiva**: está aprendiendo a acercarse al fallo.
- **Para todos los niveles.** El intermedio/avanzado debería exprimir cada serie al 100%, pero si
  marca RIR alto recibe la misma exigencia.
- El RIR **no cambia la regla de subir peso** (§6.1): sigue siendo todas las series al máximo.

### 6.4 Comparación con la última vez ✅

Dentro de una rutina, cada ejercicio se compara con la última vez que se hizo esa misma rutina:
progresó / igual / retrocedió, serie por serie. Manda el peso máximo; con el mismo peso, las reps.

### 6.5 Feedback de dolor y recuperación ✅

Al **terminar un músculo** en la sesión (se marca la última serie de su último ejercicio) aparece
una hoja con dos preguntas.

**Dolor articular** — por cada ejercicio de ese músculo: ninguno / leve / moderado / mucho.

| Respuesta | Primera vez | Si se repite la vez siguiente en ese ejercicio |
|---|---|---|
| Ninguno | — | — |
| Leve | Se registra | Se registra |
| Moderado | Aviso: **revisar técnica y propiocepción**. No se cambia nada | Sugerir **bajar el peso** de ese ejercicio |
| Mucho | Aviso: **revisar técnica y propiocepción**. No se cambia nada | Sugerir **cambiar el ejercicio** por otro del mismo músculo |

**Agujetas / recuperación** — por músculo, sobre la **sesión anterior** de ese músculo:
nunca me dolió / sanó hace rato / sanó justo a tiempo / todavía me duele.

| Respuesta | Decisión |
|---|---|
| Nunca me dolió · Sanó hace rato · Sanó justo a tiempo | No se toca (la app no suma series sola, §5.3) |
| **Todavía me duele 2 veces seguidas** | No se está recuperando: **−1 serie** semanal de ese músculo |

La baja por agujetas sigue el mismo camino que la de §5.3: sugerencia o automática según la rutina,
y se acepta o se descarta igual.

---

## 7. Decisiones de implementación a validar

Detalles que las reglas no fijaban y se resolvieron en `packages/domain`. Son fáciles de cambiar.

| Tema | Decisión | Dónde |
|---|---|---|
| RIR de cada sensación | Se toma el valor bajo del rango: 0 · 1 · 3 · 5 (no sobreestimar el esfuerzo) | `feedback/rir.ts` |
| Estado de un músculo en la sesión | Progresó si mejoró en algún ejercicio y no retrocedió en ninguno; mezcla de mejora y retroceso = se mantuvo | `volume/adjustment.ts` |
| Cuánto bajar | −1 serie si se mantuvo 2 sesiones; −2 si en alguna retrocedió | `volume/adjustment.ts` |
| Estancado con RIR alto | No se baja volumen: primero se exige apretar más | `volume/adjustment.ts` |
| Descarga general | Además del 3 de cada 4, hacen falta al menos 4 grupos evaluados (con 2+ sesiones en la ventana) | `volume/adjustment.ts` |
| Mitad de series | Se redondea hacia arriba (7 → 4) | `volume/adjustment.ts` |
| Vuelta de la descarga | +2 series por semana por grupo | `volume/adjustment.ts` |
| Duración de la descarga | 7 días desde que se acepta (o desde que se dispara, en modo automático) | `volume/deload.ts` |
| Series de cada ejercicio en la descarga y la vuelta | Se reducen en proporción al volumen de su músculo esa semana, redondeando hacia arriba y con mínimo 1 (3 series → 2) | `volume/deload.ts` |
| Qué sesiones cuentan | Las de descarga no cuentan para ajustar volumen, ni para la progresión, ni como "última vez" | `volume/history.ts`, API |
| Desde cuándo se reevalúa | Después de aceptar o descartar un cambio de un músculo, solo cuentan las sesiones posteriores; después de una descarga, las posteriores a su semana | `apps/api/src/volume/adjustments.service.ts` |
| Descarga y ajuste por músculo | Si hay una descarga propuesta o se dispara una, no se baja volumen músculo por músculo: lo resuelve la descarga | `apps/api/src/volume/adjustments.service.ts` |
| Descarga descartada | Se vuelve a evaluar con lo que se entrene desde que se descartó | `apps/api/src/volume/adjustments.service.ts` |
| Piso | Un ajuste nunca deja un músculo por debajo de 1 serie semanal | `apps/api/src/volume/volume.service.ts` |
| Sesión sin rutina | Los ajustes quedan como sugerencia (el modo automático es de la rutina) | `apps/api/src/sessions/sessions.service.ts` |
| Dónde va cada día de la división | Se mantiene la secuencia (empuje → tirón → piernas → cuerpo completo) pero se elige por cuál empieza, para que queden la menor cantidad de músculos en días seguidos (los priorizados pesan el doble) | `planning/planner.ts` |
| 3 días con prioridad | Cuerpo completo igual: los priorizados van los 3 días y el resto 2 | `planning/planner.ts` |
| 4 días con prioridad | Siempre empuje, tirón, piernas y cuerpo completo (cada tren tiene dos días); con el inferior priorizado, piernas va primero | `planning/planner.ts` |
| Músculo fuera de su grupo | Nunca, salvo los priorizados, que pueden sumar el estímulo extra en otro día (como el glúteo en un día de tirón) | `planning/planner.ts` |
| Ejercicios concretos de superior e inferior del principiante | Los de la tabla de §3.5, dentro de lo que pidió el coach | `planning/beginner.ts` |
| Series que sobran con cuerpo completo | Van primero al día del grupo del músculo y después al de cuerpo completo, que ya junta a todos. Igual puede quedar más cargado: el intermedio maneja su volumen y lo ajusta | `planning/planner.ts` |
| Abdominales | Van con el tren inferior | `training/muscles.ts` |
| Músculos chicos | Frecuencia 2 como el resto; la 3 queda para los priorizados | `planning/planner.ts` |
| Series por ejercicio | 4 = 2 + 2; 7 = 3 + 2 + 2 | `planning/planner.ts` |
| Dolor leve | Solo se registra, sin aviso | `feedback/pain.ts` |
| Dolor que se repite subiendo | Moderado y después mucho cuenta como repetido: se actúa según la última respuesta (cambiar el ejercicio). Mucho y después moderado: bajar el peso | `feedback/pain.ts` |
| Cuánto bajar el peso por dolor | −10%, como la descarga de un ejercicio (§6.1), redondeado al incremento | `feedback/pain.ts` |
| Agujetas en el primer entrenamiento de un músculo | No se pregunta: no hay sesión anterior | app |
| "Todavía me duele" seguidas | Cuentan las respuestas de ese músculo una detrás de otra; cualquier otra respuesta en el medio corta la racha | `feedback/soreness.ts` |
| Cuántos multiarticulares | 1 ejercicio → el multiarticular; 2 → 1 multiarticular + 1 aislamiento; 3 → 2 + 1. Si un músculo no tiene de un tipo, se completa con el otro | `planning/selection.ts` |
| Más de 3 ejercicios | Nunca: las series que sobran se reparten (10 = 4 + 3 + 3) | `planning/planner.ts` |
| Faltan recomendados | Se completa con el resto del catálogo que cuente para el músculo; si tampoco hay, se reparten las series en los que haya | `planning/selection.ts` |
| Mismo ejercicio para dos músculos el mismo día | No se repite (ej. face pull va a hombro posterior o a espalda alta, no a los dos) | `planning/selection.ts` |
| Volver a generar | Reemplaza las rutinas generadas antes; las propias no se tocan | `apps/api/src/routines/routines.service.ts` |
| Rango de reps y modo de las generadas | El rango por defecto del tipo de ejercicio; ajustes automáticos | `apps/api/src/routines/routines.service.ts` |
| Agujetas y estancamiento a la vez | Se suman en un solo cambio de ese músculo, con el mismo máximo de −2 series | `apps/api/src/volume/adjustments.service.ts` |
| Cambios a mano en la rutina | Cambiar series, sacar o sumar ejercicios no toca el objetivo semanal: la rutina es del usuario y el objetivo lo sigue ajustando el feedback. Tiene que quedar al menos un ejercicio | `apps/api/src/routines/routines.service.ts` |
| Cuándo sugerir pasar a intermedio | A los 90 días de la primera sesión registrada; "ahora no" la pospone 30 días (validado por el coach). Al pasar, el volumen y sus rutinas se mantienen y siguen progresando en peso y reps | `planning/beginner.ts` |

## 8. Pendientes ❓

- **Selección de ejercicios** en rutinas generadas: qué ejercicios y ángulos elige la app para cada
  músculo (depende del catálogo).
  - **Principiante** (definido por el coach): ver §3.5.
  - **Intermedio / avanzado** (definido por el coach): ver §3.4.
