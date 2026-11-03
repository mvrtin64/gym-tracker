# Deploy: API en la nube y APK privado

La app usa tres servicios gratuitos:

| Pieza | Servicio | Detalle |
|---|---|---|
| Base de datos | [Neon](https://neon.tech) | Postgres gratis que no vence. Región AWS us-east-1. |
| API | [Render](https://render.com) | Plan gratuito. Se duerme tras 15 min sin uso; la primera consulta después tarda ~1 min y la app avisa "Despertando el servidor…". |
| APK | [EAS Build](https://expo.dev/eas) | Compila el `.apk` en la nube con la URL de la API adentro. |
| Mails | [Brevo](https://www.brevo.com) | Manda el código de verificación por su API HTTP: el plan gratuito de Render bloquea SMTP (puertos 25, 465 y 587). |

## 1. Base de datos (Neon)

1. Crear cuenta en Neon y un proyecto `gym-tracker`, región **AWS US East 1 (N. Virginia)** (la misma que la API).
2. En **Connect**, desactivar **Connection pooling** y copiar la connection string directa:
   `postgresql://usuario:clave@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`.
   Va a Render como `DATABASE_URL`. No se commitea.

## 2. API (Render)

1. Crear cuenta en Render con GitHub y darle acceso al repo `gym-tracker`.
2. **New → Blueprint**, elegir el repo. Render lee [`render.yaml`](../render.yaml) y pide `DATABASE_URL`: pegar la de Neon.
3. El build instala solo la API y el dominio, aplica las migraciones y carga el catálogo de ejercicios
   (sin usuario demo: `SEED_DEMO=false`). `JWT_SECRET` lo genera Render.
4. Cuando termina, probar `https://<servicio>.onrender.com/health` → `{"ok":true}`.

Cada push a `main` vuelve a desplegar la API.

## 3. Mails (Brevo)

1. Crear cuenta en Brevo. En **Senders, Domains & Dedicated IPs → Senders**, agregar y verificar el mail
   remitente (por ejemplo tu Gmail): llega un mail de confirmación.
2. En **SMTP & API → API Keys**, generar una API key.
3. En Render, **Environment** del servicio: `BREVO_API_KEY` = la key y `MAIL_FROM` = el remitente verificado.
   Guardar redespliega la API.

Sin `BREVO_API_KEY` la API no manda mails: escribe el código en el log (sirve para desarrollo local).
Con remitente @gmail algunos mails pueden caer en spam; la app le dice al usuario que se fije ahí.

## 4. APK (EAS)

Desde `apps/mobile`, en una terminal propia (el login es interactivo):

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # crea el proyecto en Expo y agrega su id a app.json (commitearlo)
npx eas-cli@latest build -p android --profile preview
```

- Si Render le dio otra URL a la API (por ejemplo con un sufijo), cambiar `EXPO_PUBLIC_API_URL` en
  [`apps/mobile/eas.json`](../apps/mobile/eas.json) antes de compilar. La URL queda fija dentro del APK.
- La primera vez EAS pregunta si genera el keystore de Android: sí. Lo guarda Expo; hay que usar siempre
  el mismo para que el APK nuevo se instale encima del viejo sin perder la sesión.
- Al terminar, EAS da un link y un QR para descargar el `.apk`. Ese link se comparte. En el celular hay
  que permitir "instalar apps de origen desconocido".

Después de cambios en la app hay que compilar un APK nuevo y reinstalarlo. Los cambios solo de la API no
necesitan APK nuevo.

## Desarrollo local

No cambia: `pnpm db:up`, `pnpm api` y `pnpm mobile` con Expo Go. Sin `EXPO_PUBLIC_API_URL`, la app
busca la API en la IP de la PC.
