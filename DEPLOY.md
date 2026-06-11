# Despliegue en producción (Dokploy)

Arquitectura: un solo dominio público (`ventas.brunoveinz.com`) apunta al servicio
`web` (Next.js), que **proxea `/api/*`** al backend por la red interna de Docker.
El resto de los servicios (api, worker, beat, postgres, redis, qdrant) no se exponen.

## 1. DNS
Creá un registro **A**: `ventas.brunoveinz.com` → IP de tu VPS.

## 2. En Dokploy
1. **Create Project** → dentro, **Create Service → Compose**.
2. **Source**: tu repositorio Git, rama `main`, archivo `docker-compose.prod.yml`.
3. **Environment**: cargá las variables de `.env.prod.example` con valores reales
   (clave secreta, password de Postgres, `OPENAI_API_KEY`, etc.). **Nunca** en el repo.
4. **Domains**: asigná `ventas.brunoveinz.com` al servicio **`web`**, puerto **3000**,
   y activá **HTTPS** (Dokploy gestiona el certificado con Let's Encrypt).
5. **Deploy**. Dokploy construye las imágenes (`build:` del compose) y levanta todo.

## 3. Primer arranque
- El servicio `api` corre **migraciones** y **collectstatic** solo al iniciar.
- Creá un superusuario (desde la terminal del contenedor `api` en Dokploy):
  ```bash
  python manage.py createsuperuser
  ```

## 4. Configurar la empresa
Entrá a `https://ventas.brunoveinz.com`, creá tu cuenta, hacé el onboarding y
configurá el **correo (SMTP)** en Configuración.

## Notas
- Los datos persisten en los volúmenes `postgres_data` y `qdrant_data`.
- Las agendas (coach 08:00, seguimiento 09:00) las corre el servicio `beat`.
- `NEXT_PUBLIC_API_BASE_URL` queda vacío en build (same-origin); el proxy lo
  resuelve `next.config.ts` (`API_PROXY_TARGET=http://api:8000`).
