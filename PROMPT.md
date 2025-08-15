# PROMPT para generar una app web de finanzas (demo de simulación)

Quiero que generes una **aplicación web estática** (HTML/CSS/JS puro, sin backend ni dependencias externas) que permita a un usuario **simular una inversión mensual** según su **plazo objetivo** y muestre una **proyección**. Debe ser una **prueba de interfaz** (sin integraciones reales) con un diseño **intuitivo**, **sencillo** y con **colores agradables**.

## Requisitos funcionales
1. **Captura de datos del usuario**:
   - Nombre (texto) y fecha de nacimiento (date).
   - Monto que puede invertir por mes (ARS, número).
   - Motivo de la inversión (select: ahorro, viaje, vivienda, jubilación, otro).
   - Plazo en el cual quiere invertir (años, entero).
   - Método de débito mensual: tarjeta de crédito, tarjeta de débito o cuenta bancaria de Argentina (CBU/CVU).

2. **Reglas para sugerir tipo de fondo** (fondos habilitados en la República Argentina):
   - Plazo **≤ 2 años** → **Conservador** (ej.: renta fija).
   - **2 < Plazo ≤ 5 años** → **Intermedio** (mix renta fija y variable).
   - **Plazo > 5 años** → **Agresivo** (ej.: renta variable).

3. **Simulación**:
   - Aporte mensual constante durante todo el plazo (n = años × 12).
   - Tasa anual estimada (editable por el usuario) con valores por defecto según el tipo de fondo: Conservador 30%, Intermedio 45%, Agresivo 60%. **Aclaración**: las tasas son hipotéticas y para fines educativos.
   - Capitalización mensual: tasaMensual = (1 + tasaAnual)^(1/12) − 1.
   - Mostrar una **tabla** con: Mes, Saldo inicial, Aporte, Rendimiento, Saldo final.
   - Mostrar un **gráfico** (SVG o canvas sin librerías externas) con la evolución del saldo.

4. **Rescate anticipado**:
   - Aclarar al usuario que puede retirar la inversión, pero tiene un **costo** si retira antes de finalizar el plazo pactado.
   - Regla: en los **primeros 1/3** del tiempo establecido, el costo es **10%** del saldo; luego baja a **5%** hasta antes del final.
   - Ofrecer una opción para **simular rescate** en un mes específico y calcular saldo, penalidad y neto.

5. **Mensajería y disclaimers**:
   - Repetir que es una **demo** sin integración con pagos ni fondos comunes de inversión.
   - Indicar que los fondos deben ser **habilitados para la República Argentina**.
   - Indicar que las tasas usadas son **hipotéticas** y no constituyen recomendación.

## Requisitos no funcionales
- **UI/UX**: diseño responsive, tipografía del sistema, foco accesible, contrastes adecuados, componentes básicos (inputs, selects, sliders, tabla) y un **tema oscuro** suave.
- **Tecnología**: HTML + CSS + JS vanilla; no usar CDN ni frameworks. Un único `index.html`, con `styles.css` y `app.js`.
- **Local**: debe correr abriendo `index.html` en el navegador; sin servidor.

## Criterios de aceptación
- Puedo completar el formulario con mis datos, elegir plazo y método de débito.
- Se sugiere el tipo de fondo correcto según el plazo.
- Al presionar **Simular**, veo resumen, tabla y gráfico.
- Puedo activar **rescate anticipado**, elegir el mes y ver el neto luego de la penalidad (10% en primer tercio, 5% luego).
- No existen llamadas a APIs ni librerías externas.
- La interfaz se ve limpia, simple y clara.

> Si falta algún dato del dominio (por ejemplo tasas reales), mantené los campos como configurables por el usuario y dejá el descargo legal correspondiente. El objetivo principal es **probar la interfaz**.
