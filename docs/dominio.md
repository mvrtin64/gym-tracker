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
  todos los músculos llevan el mismo volumen.

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

### 3.3 Series y ejercicios dentro de una sesión 🔜

- Las series de un músculo en un día **no son un solo ejercicio**: se reparten en varios ejercicios
  con distintos ángulos. Ej. 6 series de glúteo = 3 de hip thrust + 3 de patada en polea.
- Aplica a todos los grupos.
- Base: **3 series por ejercicio** (entre 2 y 4). 5 series = 3 + 2; 6 series = 3 + 3.
- El día de énfasis de un músculo priorizado puede llevar más series (ej. 6 de glúteo = dos
  ejercicios de 3): no es mucho.
- **Series que sobran** al dividir el volumen entre días van al **día de énfasis** del músculo; si el
  reparto en 3 días queda forzado, se usa **frecuencia 2** directamente.

## 4. Ejercicios

### 4.1 Músculo objetivo 🔜

- Cada ejercicio cuenta para **un único músculo objetivo**.
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

### 5.2 Volumen inicial

**Principiante** 🔜 — volumen alto a propósito: todavía no domina la técnica, la propiocepción ni la
cercanía al fallo, así que más series menos efectivas acumulan un estímulo comparable al de pocas
series bien exprimidas.

| Días disponibles | Series semanales por músculo |
|---|---|
| 1–2 | 12 |
| 3 | 14 |
| 4 | 16 |
| 5–6 | 18 |

Es el mismo número para **todos** los músculos: el principiante no prioriza y nunca pasa de 18.

**Intermedio / Avanzado** 🔜 — **no se impone un rango**. Se parte del volumen que el usuario dice
manejar (hay quien rinde con menos de 10 series semanales de pecho y quien necesita más; las dos
cosas están bien) y desde ahí se ajusta.

### 5.3 Ajuste de volumen 🔜

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

## 6. Progresión y feedback

### 6.1 Doble progresión ✅

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
| Tipo de día | 1–2 días, o 3 sin prioridad: full body. Si no, alterna inferior/superior empezando por el tren priorizado (sin prioridad, por inferior) | `planning/planner.ts` |
| Abdominales | Van con el tren inferior | `training/muscles.ts` |
| Músculos chicos | Frecuencia 2 como el resto; la 3 queda para los priorizados | `planning/planner.ts` |
| Series por ejercicio | 4 = 2 + 2; 7 = 3 + 2 + 2 | `planning/planner.ts` |

## 8. Pendientes ❓

- **Reparto por días**: el algoritmo concreto que asigna músculos a cada día según días disponibles
  y prioridad (tren superior / inferior). Se propone en código y se valida con el coach.
- **Selección de ejercicios** en rutinas generadas: qué ejercicios y ángulos elige la app para cada
  músculo (depende del catálogo).
