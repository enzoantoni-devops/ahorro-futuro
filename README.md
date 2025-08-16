# Ahorro Futuro

Simulador web estático para planificar inversiones en fondos habilitados para la **República Argentina** (demo). El usuario ingresa **monto mensual**, **plazo**, **motivo** y **datos básicos**; la app sugiere un **tipo de fondo** según el horizonte temporal y muestra una **proyección mensual**. Incluye regla de **rescate anticipado** (10% en el primer tercio del plazo, 5% luego).

> ⚠️ Demo educativa: _no_ integra pagos ni fondos comunes de inversión reales.

## Características
- UI simple y agradable (HTML/CSS/JS puros, sin build).
- Selección de fondo por plazo:
  - ≤ 2 años: **Conservador (renta fija)**  
  - > 2 y ≤ 5 años: **Intermedio (mix fija/variable)**  
  - > 5 años: **Agresivo (renta variable)**
- Capitalización mensual simulada (proyección).
- Rescate anticipado con penalidad:
  - 0–⅓ del plazo: **10%**  
  - >⅓–fin del plazo: **5%**
- Medios de débito **(solo simulación)**: tarjeta de crédito, débito o cuenta bancaria AR.

## Estructura
.
├─ index.html
├─ styles.css
├─ app.js
├─ README.md
├─ PROMPT.md
├─ LICENSE
└─ .gitignore