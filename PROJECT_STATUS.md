# Estado do Proxecto: BeizosGal

**Data de actualización:** 26 de novembro de 2025
**Versión:** 2.0 (Refactorizada e Localizada)

## 1. Descrición Xeral
**BeizosGal** é unha aplicación web progresiva (PWA) deseñada para realizar lectura de beizos automatizada ("lip reading") sobre clips de vídeo curtos. Utiliza modelos de Intelixencia Artificial multimodal de Google (Gemini 2.5) para analizar secuencias de fotogramas e transcribir o que di o falante, aínda que o vídeo non teña audio.

A aplicación está completamente traducida ao **gallego**.

## 2. Funcionalidades Clave

### Fluxo de Traballo
1.  **Carga de Vídeo:** Arrastrar e soltar ficheiros de vídeo locais.
2.  **Selección Temporal:** Ferramenta precisa para escoller o fragmento exacto (recomendado < 3 segundos) con visualización de tempo en segundos e centésimas.
3.  **Recorte Espacial (Cropping):** Ferramenta visual para recortar o vídeo e centrarse unicamente na boca do falante, optimizando a precisión da IA.
4.  **Procesamento:** Extracción automática de fotogramas no cliente (navegador) sen necesidade de backend pesado.
5.  **Transcrición:** Análise visual mediante `gemini-2.5-pro`.
6.  **Tradución Automática:**
    *   Idiomas nativos soportados: Galego, Castelán, Inglés.
    *   Se o idioma detectado non é un destes tres, a app mostra a transcrición orixinal e unha tradución automática ao castelán.
7.  **Síntese de Voz (TTS):** Lectura en voz alta do texto transcrito usando `gemini-2.5-flash-preview-tts` (Voz: "Puck", ton natural).

## 3. Arquitectura Técnica

### Stack Tecnolóxico
*   **Frontend:** React 18, TypeScript.
*   **Build Tool:** Vite.
*   **Estilos:** Tailwind CSS.
*   **IA:** Google Generative AI SDK (`@google/genai`).

### Estrutura de Directorios
*   **`App.tsx`:** Controlador principal e máquina de estados (Upload -> TimeSelect -> Crop -> Preview -> Results).
*   **`services/geminiService.ts`:** Comunicación coa API de Gemini. Contén os prompts de sistema para lectura de beizos e configuración de TTS.
*   **`utils/media.ts`:** Lóxica crítica de manipulación de vídeo e Canvas para extraer frames e recortar imaxes en alta calidade (JPEG 0.95).
*   **`utils/formatTime.ts`:** Utilidades centralizadas para o formato de tempo (mm:ss.ms).
*   **`components/`:**
    *   `TimeSelector.tsx`: UI para escoller o rango de tempo.
    *   `Cropper.tsx`: UI para definir a área de interese.
    *   `ControlsAndResults.tsx`: Panel final de accións, selección de idioma e visualización de resultados.

## 4. Cambios Recentes e Melloras
*   **Refactorización de Código:**
    *   Eliminación de manipulación directa do DOM (`document.getElementById`) en favor de `useRef` de React.
    *   Centralización da lóxica de extracción de frames para evitar duplicidade entre transcrición e depuración.
    *   Limpeza de funcións orfas e código morto.
*   **Localización:** Tradución completa da interface (botóns, mensaxes, etiquetas) ao **Gallego**.
*   **Mellora de UX:** Cambio da voz do TTS a "Puck" para un son menos agudo e máis natural.
*   **Funcionalidade de Tradución:** Lóxica condicional no prompt para traducir automaticamente ao español idiomas non soportados nativamente pola UI.

## 5. Configuración
A aplicación require unha variable de contorno `.env.local` ou `.env`:
```
VITE_API_KEY=A_TUA_CLAVE_DE_GEMINI
```

## 6. Limitacións Coñecidas
*   A tecnoloxía de lectura de beizos é experimental e depende en gran medida da iluminación, resolución e claridade do falante.
*   O límite recomendado de procesamento é de **90 frames** (~3 segundos a 30fps) para evitar saturar a memoria do navegador e os límites da API.
