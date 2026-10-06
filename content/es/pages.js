'use strict';

/**
 * Spanish public pages. Written in Spanish.
 * Legal text translates the verified baseline. It adds no Spanish statute.
 */

const { defineLocalePages } = require('../locale-pack');

const pageFor = defineLocalePages('es', {
  market: {
    title: (name) => `My Starday en ${name} — horarios visuales para niños`,
    description: (name) => `La página de mercado para ${name}. Horarios visuales en español. Es una página de mercado, no una web de idioma aparte.`,
    h1: (name) => `Horarios visuales para familias en ${name}`,
    lead: (name) => `Esta es la página para ${name}. La web en español sigue siendo una web de idioma.`,
    registrationOpen: (name) => `Las cuentas nuevas en ${name} siguen el registro que ya existe. El ajuste por defecto está abierto.`,
    registrationClosed: (name) => `Las cuentas nuevas en ${name} no están abiertas por defecto. Eso sigue el registro que ya existe, no esta página. El ajuste por defecto está cerrado.`,
    complimentary: (name) => `En ${name} se aplica el periodo gratuito que ya existe. No se convierte solo en una suscripción. Esta página no fija un precio.`,
    introYear: (name) => `${name} mantiene la oferta ya publicada en la web sueca. Esta página no fija un precio. En este mercado no hay un periodo gratuito hasta el 31 de diciembre de 2026.`,
    trial: (name, days) => `Si más adelante se puede crear una cuenta aquí, la regla que ya existe fuera de Suecia, Irlanda y Canadá es una prueba de ${days} días. El pago tiene que estar disponible antes. En este mercado no hay un periodo gratuito hasta el 31 de diciembre de 2026, y nada se convierte solo en una suscripción. Esta página no fija un precio.`,
    notTreatment: (name) => `El botón abre la ficha general de App Store, no una ficha inventada para ${name}. My Starday es un horario visual. No es un tratamiento y no promete un resultado médico.`,
    register: 'Crear una cuenta',
    registerNote: 'El formulario pregunta dónde vive la familia. Este enlace no fija ni el país ni el precio.',
    how: 'Cómo funciona',
    playSoon: 'Google Play no está abierto aquí como página propia.',
  },
  pages: {
    home: {
      title: 'Horario visual para niños – rutinas, recompensas y pictogramas | My Starday',
      description: 'Horarios visuales que muestran a un niño qué pasa ahora y qué viene después. Pictogramas, una vista infantil y estrellas por pasos terminados.',
      h1: 'Horarios visuales que muestran a un niño qué pasa ahora y qué viene después.',
      ogTitle: 'Horario visual para niños',
      faqs: [
        { q: '¿Qué es My Starday?', a: 'Un horario visual para familias. El niño ve el siguiente paso. La persona adulta guarda los ajustes.' },
        { q: '¿Las estrellas se compran?', a: 'No. Una estrella sale de un paso terminado. No se puede comprar.' },
        { q: '¿Es un tratamiento?', a: 'No. My Starday ayuda en el día a día y no promete un resultado médico.' },
      ],
      body(href) {
        return `
          <p class="lead">Un niño se tranquiliza cuando el siguiente paso se ve. My Starday muestra el día en imágenes: ahora, después, listo.</p>
          <h2>Lo que ve el niño</h2>
          <p>La vista infantil muestra un paso cada vez. La persona adulta prepara el plan. El niño marca. Varios niños pueden compartir la misma casa, cada uno con su plan.</p>
          <h2>Estrellas</h2>
          <p>Un paso terminado puede dar una estrella. Las estrellas no se compran. No sustituyen un acuerdo hecho antes. El detalle está en el <a href="${href('rewardSystem')}">sistema de recompensas</a>.</p>
          <h2>No es un tratamiento</h2>
          <p>El plan puede ayudar a niños que necesitan más claridad, también con TDAH o autismo, y también a familias sin diagnóstico. My Starday no es un tratamiento y no promete un resultado concreto.</p>
          <p>La web en español explica el producto. El país es otra cosa. Hay una página propia para <a href="/es/es">España</a>.</p>
          <p><a href="${href('howItWorks')}">Cómo funciona</a> · <a href="${href('visualSchedule')}">Horario visual</a> · <a href="${href('morningRoutine')}">Rutina de la mañana</a></p>
        `;
      },
    },
    howItWorks: {
      title: 'Cómo funciona My Starday | Horario visual',
      description: 'La persona adulta prepara el día. El niño ve el siguiente paso y lo marca. Las estrellas salen de un paso hecho, no se compran.',
      h1: 'Cómo funciona My Starday',
      ogTitle: 'Cómo funciona',
      faqs: [
        { q: '¿Quién configura el plan?', a: 'Una persona adulta. El niño ve la vista infantil y marca los pasos.' },
        { q: '¿El niño necesita un correo?', a: 'No. El niño entra con un nombre y un PIN.' },
      ],
      body(href) {
        return `
          <p class="lead">Tres cosas sostienen la mañana: un plan visible, un niño que marca solo, y una persona adulta que guarda los ajustes.</p>
          <h2>1. El plan</h2>
          <p>Colocas las actividades en el orden real de la mañana. Las imágenes ayudan si el niño aún no lee. El <a href="${href('visualSchedule')}">horario visual</a> muestra ahora y después.</p>
          <h2>2. La vista infantil</h2>
          <p>El niño ve el siguiente paso, no los ajustes de la familia. En esa vista no hay publicidad ni red social.</p>
          <h2>3. La estrella</h2>
          <p>Un paso marcado puede dar una estrella. La estrella no se compra. El acuerdo está hecho antes, no en medio del enfado.</p>
          <p>My Starday ayuda en el día a día. No es un tratamiento y no sustituye el criterio de un médico, un terapeuta o la escuela.</p>
        `;
      },
    },
    visualSchedule: {
      title: 'Horario visual para niños | My Starday',
      description: 'Un horario visual muestra a un niño qué pasa ahora y qué viene después. Pocos pasos, imágenes conocidas, un orden claro.',
      h1: 'Horario visual para niños',
      ogTitle: 'Horario visual',
      faqs: [
        { q: '¿Cuántos pasos?', a: 'A menudo bastan cuatro o cinco. Una lista más larga vale si el orden ya se conoce.' },
        { q: '¿Fotos o símbolos?', a: 'Imágenes que el niño ya reconoce. Las fotos de casa funcionan bien.' },
      ],
      body(href) {
        return `
          <p class="lead">Un horario visual hace visible el orden. El niño no tiene que adivinar lo que sigue.</p>
          <h2>Ahora y después</h2>
          <p>Muestra solo el paso actual y el siguiente. Una lista larga en la pared ayuda menos que un gesto claro.</p>
          <h2>Si un paso se atasca</h2>
          <ul>
            <li><strong>Parte el paso.</strong> «Vestirse» pasa a calcetines, pantalón, camiseta.</li>
            <li><strong>Uno cada vez.</strong></li>
            <li><strong>Señalar en lugar de repetir.</strong></li>
          </ul>
          <p>Por la mañana, la <a href="${href('morningRoutine')}">rutina de la mañana</a>. En la semana, el <a href="${href('weeklySchedule')}">plan semanal</a> dice qué día es.</p>
          <p>My Starday no es un tratamiento y no promete un resultado médico.</p>
        `;
      },
    },
    morningRoutine: {
      title: 'Rutina de la mañana para niños | My Starday',
      description: 'Una rutina de mañana con imágenes baja el número de recordatorios hablados. El mismo orden, día tras día.',
      h1: 'Rutina de la mañana para niños',
      ogTitle: 'Rutina de la mañana',
      faqs: [
        { q: '¿Qué entra en la mañana?', a: 'Solo lo que de verdad pasa antes de la puerta. Levantarse, vestirse, comer, dientes, abrigo.' },
        { q: '¿Y si falta tiempo?', a: 'Acorta la lista en lugar de hablar más deprisa. Un plan más corto es un plan de verdad.' },
      ],
      body(href) {
        return `
          <p class="lead">El mismo orden convierte una lista en costumbre. En lugar de repetir «lávate los dientes», miráis la siguiente imagen.</p>
          <h2>Ejemplo</h2>
          <ol>
            <li>Levantarse</li>
            <li>Baño y manos</li>
            <li>Vestirse</li>
            <li>Desayuno</li>
            <li>Dientes</li>
            <li>Abrigo, zapatos, mochila</li>
          </ol>
          <p>Muchos niños de infantil van mejor con cuatro o cinco pasos.</p>
          <p>Las familias que buscan más apoyo en los cambios pueden leer la <a href="${href('neurodiverseRoutines')}">guía sobre claridad</a>. My Starday sostiene el día, no es un tratamiento.</p>
        `;
      },
    },
    weeklySchedule: {
      title: 'Plan semanal con pictogramas para niños | My Starday',
      description: 'Un plan semanal con pictogramas muestra qué día es, no solo lo que pasa ahora.',
      h1: 'Plan semanal con pictogramas',
      ogTitle: 'Plan semanal',
      faqs: [
        { q: '¿En qué se diferencia del horario del día?', a: 'El día son los pasos de hoy. La semana muestra en qué se distinguen los días.' },
        { q: '¿Desde qué edad?', a: 'A menudo cerca de la edad escolar, cuando la semana cambia más. Los más pequeños necesitan primero el hoy.' },
      ],
      body(href) {
        return `
          <p class="lead">Un plan de semana ayuda cuando el día laborable y el fin de semana son distintos, o cuando «¿qué hay mañana?» necesita respuesta antes de dormir.</p>
          <p>Lunes con deporte, miércoles con el otro progenitor, viernes con una película. Las imágenes lo hacen visible antes de que un niño lea un calendario.</p>
          <p>El <a href="${href('visualSchedule')}">horario visual</a> sigue siendo los pasos de hoy. El plan de semana dice qué día es.</p>
          <p>My Starday no promete un resultado médico.</p>
        `;
      },
    },
    neurodiverseRoutines: {
      title: 'Rutinas para niños neurodivergentes | My Starday',
      description: 'Más claridad en el día para niños que necesitan transiciones nítidas. My Starday ayuda en lo cotidiano, no es un tratamiento ni un diagnóstico.',
      h1: 'Rutinas para niños neurodivergentes',
      ogTitle: 'Rutinas para niños neurodivergentes',
      faqs: [
        { q: '¿Hace falta un diagnóstico?', a: 'No. El plan ayuda donde hace falta más claridad. Un diagnóstico no es un requisito.' },
        { q: '¿Sustituye una terapia?', a: 'No. No es un tratamiento y no sustituye el criterio de profesionales.' },
      ],
      body(href) {
        return `
          <p class="lead">Algunos niños necesitan ver el siguiente paso, no oírlo más alto. Vale con diagnóstico y sin él.</p>
          <h2>TDAH: empezar y quedarse en el paso</h2>
          <p>El cambio se atasca a menudo porque el siguiente paso no se ve. Un plan con una casilla da una respuesta al momento: este paso está hecho.</p>
          <h2>Autismo: un día previsible</h2>
          <p>Un orden distinto puede pesar. Un <a href="${href('weeklySchedule')}">plan semanal</a> muestra antes qué día llega. Un paso quitado debe cambiarse a la vista, no desaparecer en silencio.</p>
          <p>My Starday es una ayuda educativa en lo cotidiano. No es un tratamiento médico y no sustituye el criterio de un médico, un terapeuta ocupacional, un logopeda o la escuela. Fichas del tipo primero, después y listo aún no están como PDF en español. Esas fichas se inspiran en ese enfoque: no son un método oficial ni una certificación.</p>
        `;
      },
    },
    rewardSystem: {
      title: 'Sistema de recompensas para niños | My Starday',
      description: 'Una recompensa acordada antes no es un trueque en el momento. El niño gana las estrellas. No se compran.',
      h1: 'Sistema de recompensas para niños, sin convertirlo en un trueque',
      ogTitle: 'Sistema de recompensas',
      faqs: [
        { q: '¿Una tabla de estrellas es un soborno?', a: 'No, si la recompensa está fijada antes y ligada a algo que el niño puede hacer. El trueque se ofrece en el momento para que algo pare.' },
        { q: '¿Cuántas estrellas?', a: 'Empieza con una estrella por paso terminado. Las estrellas no se compran.' },
      ],
      body(href) {
        return `
          <p class="lead">«¿Eso no es un soborno?» depende de cuándo se hace el acuerdo. Acordado antes, un tablero puede sostener una costumbre. Ofrecido en medio del enfado, se vuelve una negociación.</p>
          <p>En un <a href="${href('visualSchedule')}">horario visual</a> la cadena es simple: ver el paso, hacerlo, marcarlo, recibir la estrella.</p>
          <ol>
            <li>Sé concreto. Premia «se lava los dientes sin recordatorio», no «es bueno».</li>
            <li>Muestra el avance.</li>
            <li>Cuenta el intento, no solo la mañana perfecta.</li>
            <li>Deja que el niño piense la recompensa contigo.</li>
            <li>Espacia las estrellas cuando la costumbre ya se sostiene.</li>
          </ol>
          <p>Las estrellas no se compran. My Starday no promete un resultado médico.</p>
        `;
      },
    },
    resources: {
      title: 'Recursos para rutinas visuales | My Starday',
      description: 'Lo que ya existe en español y lo que aún no es un PDF. La aplicación y una hoja impresa son dos cosas distintas.',
      h1: 'Recursos',
      ogTitle: 'Recursos',
      faqs: [
        { q: '¿Hay PDF en español?', a: 'Todavía no. Esta página no vende hojas suecas como si estuvieran traducidas.' },
      ],
      body(href) {
        return `
          <p class="lead">La aplicación muestra el día en la pantalla. Una hoja impresa es otra cosa. Aquí aún no hay PDF en español.</p>
          <p>En la aplicación preparas el <a href="${href('visualSchedule')}">horario</a>, la <a href="${href('morningRoutine')}">rutina de la mañana</a> y el <a href="${href('weeklySchedule')}">plan de la semana</a>. El niño ve el mismo orden en la vista infantil.</p>
          <p>No enlazamos una biblioteca en otro idioma como si fuera española. Si llegan hojas en español, estarán en esta página.</p>
        `;
      },
    },
    faq: {
      title: 'Preguntas frecuentes | My Starday',
      description: 'Respuestas cortas sobre el horario, las estrellas, la vista infantil y lo que My Starday no es.',
      h1: 'Preguntas frecuentes',
      ogTitle: 'Preguntas frecuentes',
      faqs: [
        { q: '¿Para quién es esta web?', a: 'La web en español explica el producto. España tiene una página de mercado. El idioma sigue siendo el español.' },
        { q: '¿Puedo comprar estrellas?', a: 'No.' },
        { q: '¿Es una aplicación de terapia?', a: 'No. Ni tratamiento ni resultado médico prometido.' },
        { q: '¿Dónde se crea la cuenta?', a: 'En el formulario que ya existe. Pregunta dónde vive la familia. Una página de mercado no fija el país sola.' },
      ],
      body(href) {
        return `
          <p class="lead">Las respuestas cortas. Los textos largos están en las guías.</p>
          <h2>Idioma y país</h2>
          <p>Esta web está en español. El país se elige aparte. Una página de mercado no cambia el idioma ni crea una cuenta.</p>
          <h2>El niño</h2>
          <p>El niño ve el plan y marca. Los ajustes, las invitaciones y la cuenta se quedan con la persona adulta. Más en <a href="${href('howItWorks')}">Cómo funciona</a>.</p>
          <h2>Estrellas</h2>
          <p>Las estrellas salen de pasos terminados. No se compran. Lee el <a href="${href('rewardSystem')}">sistema de recompensas</a>.</p>
        `;
      },
    },
    privacy: {
      title: 'Política de privacidad — My Starday',
      description: 'Qué datos trata My Starday, qué no recogemos y qué derechos da el RGPD.',
      h1: 'Política de privacidad de My Starday',
      ogTitle: 'Privacidad',
      body: `
        <p class="updated">Última actualización: octubre de 2026</p>
        <p>Tratamos tu privacidad con cuidado. My Starday recoge lo mínimo: solo lo que la aplicación necesita para funcionar. No vendemos tus datos ni los usamos para publicidad dirigida. Un uso fuera del servicio solo ocurre si tú lo eliges, o si hace falta para que nuestros encargados mantengan el servicio en marcha.</p>
        <p><strong>Responsable del tratamiento:</strong> Papa Bravo AB es responsable del tratamiento de tus datos personales. Nos escribes en el <a href="/en/contact">formulario de contacto</a>.</p>
        <h2>Qué recogemos</h2>
        <p>Tratamos datos sobre la base del contrato, para prestar la aplicación y las funciones por las que te registras. De adultos y familias recogemos:</p>
        <ul>
          <li><strong>Correo electrónico</strong> — para entrar y para mensajes de la cuenta</li>
          <li><strong>Nombre y apellidos</strong> — para reconocer la cuenta</li>
          <li><strong>Registro de actividades</strong> — qué actividades se terminaron, y cuándo</li>
          <li><strong>Estrellas</strong> — estrellas ganadas y canjeadas</li>
          <li><strong>Planes y actividades</strong> — lo que creas</li>
        </ul>
        <p><strong>Privacidad de los niños:</strong> un niño solo se reconoce por un nombre o apodo y un emoji elegido. No recogemos apellidos, número personal ni datos de contacto de un niño.</p>
        <h2>Qué no recogemos</h2>
        <ul>
          <li>Ni apellidos de niños</li>
          <li>Ni números personales, de adultos ni de niños</li>
          <li>Ni datos de salud, diagnóstico o discapacidad de un niño</li>
          <li>Ni datos de pago. Las compras van por App Store o Google Play</li>
          <li>Ni datos de ubicación</li>
        </ul>
        <h2>Para qué usamos los datos</h2>
        <ul>
          <li>Mostrar el plan del día al niño</li>
          <li>Guardar el avance y las estrellas</li>
          <li>Enviar el correo de verificación y los mensajes de la cuenta</li>
          <li>Responder a los mensajes que nos envías</li>
        </ul>
        <h2>Con quién se comparten</h2>
        <p>No compartimos tus datos con terceros para publicidad. Estos encargados mantienen el servicio. Solo tratan por nuestra cuenta y según el RGPD:</p>
        <ul>
          <li><strong>Neon (base de datos)</strong> — cuenta, planes, actividades y datos de la familia</li>
          <li><strong>Alojamiento propio (VPS en la UE/EEE)</strong> — la aplicación web y la API</li>
          <li><strong>Resend (correo)</strong> — correo transaccional, como verificación, contraseña y bienvenida</li>
          <li><strong>Cloudflare R2</strong> — fotos de perfil subidas si usas esa función</li>
          <li><strong>Apple y Google</strong> — acceso y avisos push mediante APNs y FCM si usas esas funciones</li>
        </ul>
        <h2>Informe para una conversación</h2>
        <p>Si creas, como persona adulta responsable, un enlace temporal a un resumen de cifras de actividad y recompensas elegidas, puedes compartirlo por ejemplo con un docente o un terapeuta. Eso solo ocurre porque tú lo eliges. Tú decides el contenido y puedes retirar el enlace. Quien lo recibe no necesita cuenta.</p>
        <p>Si proteges un enlace con un código, no compartas ese código en el mismo mensaje que el enlace.</p>
        <h2>Acceso con Apple o Google</h2>
        <ul>
          <li><strong>Acceso con Apple:</strong> tratamos el nombre y el correo. Si eliges «Ocultar mi correo», guardamos la dirección de reenvío única que crea Apple, para poder enviar mensajes de la cuenta.</li>
          <li><strong>Acceso con Google:</strong> recibimos y guardamos el correo y el nombre de la cuenta de Google para crear el perfil.</li>
        </ul>
        <p>El tratamiento que hacen Apple y Google por su cuenta sigue sus propias políticas de privacidad.</p>
        <h2>Avisos y tokens del dispositivo</h2>
        <p>Si activas los avisos, guardamos, con tu consentimiento, un token único del dispositivo (APNs o FCM) para que el mensaje llegue al aparato correcto. El token va ligado a tu cuenta.</p>
        <p>Los tokens caducan al salir, o si la plataforma marca el token como no válido. No guardamos un rasgo del dispositivo sin una suscripción push activa. Se desactiva en los ajustes de la aplicación o en el aparato.</p>
        <h2>Conservación</h2>
        <p>Guardamos los datos mientras la cuenta está activa. Si borras la cuenta, todos los datos se eliminan al momento y de forma definitiva.</p>
        <h2>Borrar la cuenta</h2>
        <p>Borras la cuenta en la aplicación, en ajustes. Confirmas con tu contraseña o con el acceso del tercero.</p>
        <p>No se puede deshacer. Desaparecen la cuenta adulta, los perfiles de los niños, los planes, los diarios, las valoraciones, las recompensas y las invitaciones.</p>
        <h2>Almacenamiento y seguridad</h2>
        <p>Procuramos guardar los datos centrales en la UE/EEE cuando corresponde. Algunos proveedores pueden tratar fuera del EEE. Las transferencias y las garantías constan en esta política y se revisan de forma continua. Las conexiones van cifradas (HTTPS). Las contraseñas no están en texto legible. Usamos bcrypt.</p>
        <h2>Cookies</h2>
        <ul>
          <li><strong>Cookies estrictamente necesarias</strong> — siempre activas. Sesión y protección CSRF para un acceso seguro.</li>
          <li><strong>Preferencias</strong> — guardadas en el dispositivo, por ejemplo un tema.</li>
          <li><strong>Medición y marketing</strong> — Google Analytics 4, Meta Pixel y Google Ads. Apagadas por defecto, hasta que aceptas en el aviso de cookies.</li>
        </ul>
        <p>Guardamos tu elección como máximo un año. Puedes cambiarla en el aviso o en los ajustes. Los datos de rutina de los niños no van a plataformas publicitarias.</p>
        <h2>Tus derechos (RGPD)</h2>
        <ul>
          <li>Derecho a borrar tu cuenta y los datos</li>
          <li>Derecho de acceso</li>
          <li>Derecho a que se corrijan datos inexactos</li>
          <li>Derecho de oposición o de limitación</li>
          <li>Derecho a reclamar ante la autoridad sueca Integritetsskyddsmyndigheten (IMY) si consideras que incumplimos el RGPD</li>
        </ul>
        <h2>Contacto</h2>
        <p>¿Preguntas sobre este tratamiento? Usa el <a href="/en/contact">formulario de contacto</a>.</p>
      `,
    },
    terms: {
      title: 'Condiciones de uso — My Starday',
      description: 'Las condiciones de uso de My Starday: cuenta, niños, precio y responsabilidad.',
      h1: 'Condiciones de uso',
      ogTitle: 'Condiciones de uso',
      body: `
        <p class="updated">Última actualización: octubre de 2026</p>
        <p>Gracias por usar My Starday. Estas condiciones quieren ser claras y honestas. Las preguntas van por el <a href="/en/contact">formulario de contacto</a>.</p>
        <h2>1. El servicio</h2>
        <p>My Starday es un servicio digital para familias que quieren un plan del día estructurado, marcar el avance de un niño con estrellas y dejar que el niño siga las actividades en una vista propia. El servicio es para padres y personas adultas responsables y sus hijos. Una familia tiene al menos una persona adulta con cuenta. Los niños entran con un PIN en la vista infantil.</p>
        <h2>2. Cuenta y seguridad</h2>
        <ul>
          <li>Elige una contraseña fuerte y no la compartas</li>
          <li>Protege tu correo. Con él recuperas el acceso</li>
          <li>El PIN de la vista infantil es solo para el niño y las personas adultas responsables</li>
          <li>No uses la aplicación de un modo que infrinja la ley sueca</li>
        </ul>
        <p>Eres responsable de todo lo que ocurra en tu cuenta, aunque la use otra persona. Si sospechas un abuso, escribe enseguida.</p>
        <h2>3. Niños y datos personales</h2>
        <p>My Starday trata datos de niños. Seguimos el RGPD y el principio de minimización:</p>
        <ul>
          <li>Los niños se reconocen por un nombre y un emoji elegido. Sin apellidos, sin número personal, sin datos de contacto</li>
          <li>Los padres o personas adultas responsables registran los datos y aceptan el uso compartido</li>
          <li>No usamos datos de niños para publicidad ni para nada que no sea el servicio</li>
          <li>Los informes y los planes solo se comparten si una persona adulta comparte ella misma un enlace temporal</li>
        </ul>
        <h2>4. Contenido que creas</h2>
        <p>Los planes, recompensas, actividades y observaciones que añades son tuyos o de tu familia. Nos das derecho a guardarlos y mostrarlos mientras la cuenta esté activa. No los copiamos para publicidad, no los vendemos y no los usamos en marketing.</p>
        <h2>5. Uso</h2>
        <p>El servicio es para un uso personal en tu familia. No está permitido:</p>
        <ul>
          <li>Un uso comercial sin acuerdo con Papa Bravo AB</li>
          <li>Manipular planes, estrellas o recompensas fuera de los recorridos normales de la aplicación</li>
          <li>Medios automáticos, extractores o bots contra el servicio</li>
          <li>Publicar contenido ilegal, ofensivo o dañino</li>
        </ul>
        <h2>6. Cierre y borrado</h2>
        <p>Puedes borrar la cuenta de forma definitiva en cualquier momento desde los ajustes de la aplicación, confirmando con tu contraseña.</p>
        <p>El borrado elimina al momento y de forma definitiva la cuenta adulta, todos los niños, los planes, los registros de actividad, las estrellas, las recompensas y las observaciones que hubiera.</p>
        <p>Podemos suspender una cuenta que infrinja estas condiciones o la ley sueca.</p>
        <h2>7. Precio</h2>
        <p>Las familias en Irlanda y Canadá pueden usar My Starday gratis hasta el 31 de diciembre de 2026 incluido. En ese periodo no hace falta un pago. El periodo gratuito no se convierte automáticamente en una suscripción. Desde el 1 de enero de 2027 puedes elegir una suscripción en App Store o Google Play. En esta página no hay caja web. En otros países valen el precio y el acceso que la aplicación muestra para ese país. Las familias suecas que empiezan a partir del 3 de octubre de 2026 pueden probar la aplicación 14 días y después elegir 59 coronas suecas al mes o 590 coronas suecas al año en la aplicación. Las familias que ya tienen cuenta conservan su oferta existente.</p>
        <h2>8. Cambios</h2>
        <p>Podemos adaptar estas condiciones, por ejemplo tras un cambio legal, una función nueva o una aclaración. Si un cambio es importante, lo diremos por correo o con un aviso en la aplicación.</p>
        <p>Si sigues usando el servicio después, eso vale como aceptación de las nuevas condiciones.</p>
        <h2>9. Responsabilidad</h2>
        <p>My Starday se ofrece tal cual. Hacemos lo posible por mantener el servicio estable y seguro, sin poder garantizar que esté siempre disponible sin interrupción.</p>
        <p>Papa Bravo AB no responde de:</p>
        <ul>
          <li>Pérdida de datos por fuerza mayor</li>
          <li>Un daño porque compartes un PIN o unos datos de acceso con quien no debería tenerlos</li>
          <li>Un daño indirecto, una oportunidad perdida o datos perdidos, salvo que la ley sueca disponga otra cosa</li>
        </ul>
        <p>Eres responsable de un uso conforme a estas condiciones y a la ley sueca.</p>
        <h2>10. Contacto</h2>
        <p>¿Preguntas sobre estas condiciones o sobre el servicio? Usa el <a href="/en/contact">formulario de contacto</a>.</p>
      `,
    },
  },
});

module.exports = { pageFor };
