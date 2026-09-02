# Before I Imagine

**Before I Imagine** is an interactive drawing archive that explores how people form and choose visual representations of a familiar object through drawing.

Participants are invited to draw an apple in response to four prompts — **Default, Touch, Taste, and Imperfect** — and record their thoughts after each drawing. The drawings and reflections are collected as part of a continuously growing online archive.

By comparing drawings produced under different prompts, the project explores how people select and organise recognisable features when representing a familiar object, and how these visual representations may change when different sensory experiences and memories are recalled.

## Live Project

**Live Website:**  
https://before-i-imagine.onrender.com/

**Project Video:**  
https://youtu.be/Qxgub5ZwzAs

## Project Structure

The platform guides participants through four drawing prompts:

1. **Default** — Draw the first apple that comes to your mind.
2. **Touch** — Draw an apple based on touch memory.
3. **Taste** — Draw an apple based on taste memory.
4. **Imperfect** — Draw an apple that is not too correct.

After each drawing, participants can record a short reflection about their drawing process.

Submitted drawings and reflections become part of the archive and can be explored through different sections of the platform, including the **Archive**, **Wall**, and **Results** pages.

## Technical Implementation

The project was developed as an interactive web platform using:

- **p5.js** — drawing interactions and canvas functionality
- **Supabase** — storage of participant drawings, drawing processes, and reflections
- **Node.js** — server-side functionality and hardware integration
- **OpenAI API** — image content moderation before drawings enter the public archive
- **Render** — deployment and hosting of the online platform
- **Thermal receipt printer** — generating physical records of participants' drawings and related information

The website and interaction structure were developed iteratively through system diagrams, user flowcharts, interface sketches, testing, and interface refinement.

## How to Run

### Online Access

The project is deployed on Render and can be accessed directly through the live website:

https://before-i-imagine.onrender.com/

No local installation is required to access the online version.

### Running Locally

1. Clone or download this repository.

2. Open the project folder in Terminal.

3. Install the required dependencies:

   ```bash
   npm install
   ```

4. Configure the following environment variables:

   - `OPENAI_API_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_URL`

   Private API keys and credentials are not included in this repository for security reasons.

5. Start the server:

   ```bash
   node server.js
   ```

6. Open the local address shown in the terminal in a web browser.

### Thermal Printer

The receipt printing functionality requires the thermal printer used in the exhibition setup. The main web platform can still be accessed and used without the printer.

## Exhibition

The online platform was presented as a physical interactive installation.

Participants could create drawings through the drawing interface, explore previously submitted drawings in the archive, and receive a printed thermal receipt containing their drawings and related information.

Printed receipts were also collected and displayed as part of the installation, extending the growing digital archive into the physical exhibition space.

## Generative AI Use

ChatGPT and Codex by OpenAI were used to assist with code generation, debugging, and technical implementation during the development of the project.

Generative AI supported tasks including:

- development and adjustment of the p5.js drawing interface
- Supabase database integration
- implementation and debugging of interface interactions
- OpenAI API integration for image content moderation
- thermal receipt printer integration
- technical troubleshooting

The development process was iterative and prompt-based. I defined the project requirements, interaction logic, visual design, and intended functionality, and reviewed, tested, and modified the generated code throughout development.

I remained responsible for the conceptual development, design decisions, functional planning, testing, integration, and final implementation of the project.

## Author

**Shiyi Ge**

Email: geshiyi0310@163.com
Final project — *Before I Imagine*
