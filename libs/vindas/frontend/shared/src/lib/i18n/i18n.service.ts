import { Injectable, computed, signal } from '@angular/core';

export type Lang = 'es' | 'en';

export interface ServiceItem {
  readonly tone: 'coral' | 'sage' | 'gold';
  readonly icon: 'individual' | 'pareja' | 'infantil';
  readonly d: string;
  readonly t: string;
  readonly body: string;
  readonly meta: string;
}
export interface PsicoGroup {
  readonly cat: string;
  readonly items: readonly { readonly code: string; readonly name: string }[];
}
export interface Strings {
  nav: { inicio: string; sobre: string; servicios: string; psico: string; contacto: string };
  sub: { inicio: string; sobre: string; servicios: string; psico: string; contacto: string };
  cta: string;
  waText: string;
  hero: {
    eyebrow: string; title: string; sub: string; primary: string; secondary: string;
    cred: string; frameTitle: string; frameHint: string; badge: string; chips: readonly string[];
  };
  sobre: {
    eyebrow: string; title: string; p1: string; p2: string; p3: string;
    frameTitle: string; frameHint: string; formacionTitle: string; expTitle: string;
    formacion: readonly { readonly t: string; readonly s: string }[];
    exp: readonly { readonly t: string; readonly s: string }[];
  };
  servicios: {
    eyebrow: string; title: string; sub: string; moreTitle: string; areasTitle: string;
    items: readonly ServiceItem[]; more: readonly string[]; areas: readonly string[];
  };
  psico: { eyebrow: string; title: string; sub: string; note: string; groups: readonly PsicoGroup[] };
  contacto: {
    eyebrow: string; title: string; sub: string; waBtn: string; formTitle: string;
    f_name: string; f_email: string; f_msg: string; f_send: string;
    mapTitle: string; mapBtn: string; region: string;
    lblWhats: string; lblPhone: string; lblEmail: string; lblDir: string;
    address: string; mailSubject: string;
  };
  footer: { tagline: string; rights: string; code: string };
}

const STR: Record<Lang, Strings> = {
  es: {
    nav: { inicio: 'Inicio', sobre: 'Sobre mí', servicios: 'Servicios', psico: 'Psicodiagnósticos', contacto: 'Contacto' },
    sub: { inicio: 'Bienvenida', sobre: 'Conóceme', servicios: 'Acompañamiento', psico: 'Evaluación', contacto: 'Hablemos' },
    cta: 'Agendar cita',
    waText: 'Hola Valeria, me gustaría agendar una cita.',
    hero: {
      eyebrow: 'Psicóloga Clínica · Heredia, Costa Rica',
      title: 'Un espacio cálido para cuidar tu salud emocional.',
      sub: 'Psicología clínica para adultos, adolescentes y niños. Terapia individual, de pareja e infantil, con un acompañamiento humano, cercano y profesional.',
      primary: 'Agendar por WhatsApp', secondary: 'Conocer más',
      cred: 'Colegio de Profesionales en Psicología de Costa Rica · Código 10856',
      frameTitle: 'Retrato profesional', frameHint: 'Aquí irá la fotografía de Valeria',
      badge: 'Licda. en Psicología · UNIBE',
      chips: ['Ansiedad', 'Depresión', 'Duelo', 'Autoestima', 'Pareja', 'Niñez', 'Emociones', 'Crisis'],
    },
    sobre: {
      eyebrow: 'Sobre mí', title: 'Licda. Valeria Vindas Salas',
      p1: 'Soy psicóloga clínica en Heredia, Costa Rica, y miembro del Colegio de Profesionales en Psicología de Costa Rica (Código 10856).',
      p2: 'Licenciada en Psicología por la Universidad de Iberoamérica (UNIBE), acompaño a adultos, adolescentes y niños en procesos de terapia individual, de pareja e infantil, psicodiagnóstico e intervención en crisis.',
      p3: 'Mi enfoque es humano y cercano: un espacio seguro donde sentirte escuchada y acompañada, para restaurar y reforzar tus emociones.',
      frameTitle: 'Fotografía de Valeria', frameHint: 'Espacio reservado para tu retrato',
      formacionTitle: 'Formación', expTitle: 'Experiencia',
      formacion: [
        { t: 'Licenciatura en Psicología', s: 'Universidad de Iberoamérica (UNIBE) · Costa Rica' },
        { t: 'Bachillerato en Psicología', s: 'Universidad de Iberoamérica (UNIBE) · Costa Rica' },
        { t: 'Colegiatura profesional', s: 'Colegio de Profesionales en Psicología · Código 10856' },
      ],
      exp: [
        { t: 'Centro de Atención Neuro-Psicológica Dr. Gonzalo Adís Castro', s: 'Terapia Racional Emotiva, psicodiagnóstico y terapia con niños, adolescentes y adultos.' },
        { t: 'Asociación Albergue de Rehabilitación', s: 'Acompañamiento psicológico a personas adultas mayores: terapia individual y grupal, historias de vida.' },
      ],
    },
    servicios: {
      eyebrow: 'Servicios', title: 'Acompañamiento para cada etapa',
      sub: 'Terapia psicológica adaptada a tus necesidades, en un espacio confidencial y seguro.',
      moreTitle: 'También ofrezco', areasTitle: 'Áreas de consulta',
      items: [
        { tone: 'coral', icon: 'individual', d: 'Adultos y adolescentes', t: 'Terapia Individual', body: 'Un espacio personal para trabajar la ansiedad, la depresión, el duelo, la autoestima y el manejo de las emociones.', meta: '55 min – 1 h por sesión' },
        { tone: 'sage', icon: 'pareja', d: 'Vínculos y comunicación', t: 'Terapia de Pareja', body: 'Acompañamiento para fortalecer la comunicación, resolver conflictos y reconstruir la conexión.', meta: '1 h por sesión' },
        { tone: 'gold', icon: 'infantil', d: 'Niñas y niños', t: 'Terapia Infantil', body: 'Apoyo emocional y conductual a través del juego y técnicas adaptadas a cada edad.', meta: 'Sesión adaptada' },
      ],
      more: ['Talleres', 'Terapia grupal', 'Intervención en crisis', 'Psicodiagnóstico'],
      areas: ['Ansiedad', 'Depresión', 'Duelo', 'Fobias', 'Autoestima', 'Estrés', 'Manejo de emociones', 'Relaciones', 'Crisis'],
    },
    psico: {
      eyebrow: 'Psicodiagnósticos', title: 'Evaluación psicológica con respaldo profesional',
      sub: 'Aplicación, resolución y devolución de resultados de pruebas psicodiagnósticas estandarizadas.',
      note: 'Cada proceso incluye aplicación, calificación y una devolución cuidadosa de los resultados.',
      groups: [
        { cat: 'Inteligencia', items: [ { code: 'WPPSI', name: 'Escala Wechsler para preescolar' }, { code: 'WISC-V', name: 'Escala Wechsler para niños' }, { code: 'WAIS-IV', name: 'Escala Wechsler para adultos' } ] },
        { cat: 'Personalidad', items: [ { code: 'MMPI', name: 'Inventario Multifásico de Personalidad de Minnesota' } ] },
        { cat: 'Desarrollo infantil', items: [ { code: 'EDIN', name: 'Evaluación y estimulación del desarrollo del niño' } ] },
        { cat: 'Emocional infantil', items: [ { code: 'CMASR-2', name: 'Escala de ansiedad manifiesta para niños' }, { code: 'CDI', name: 'Inventario de depresión infantil' } ] },
      ],
    },
    contacto: {
      eyebrow: 'Contacto', title: 'Agendemos tu cita',
      sub: 'Escribime por WhatsApp o completá el formulario. Con gusto te responderé.',
      waBtn: 'Escribir por WhatsApp', formTitle: 'Enviar un mensaje',
      f_name: 'Nombre', f_email: 'Correo', f_msg: '¿En qué puedo ayudarte?', f_send: 'Enviar mensaje',
      mapTitle: 'Consultorio', mapBtn: 'Ver en Google Maps', region: 'Heredia, Costa Rica',
      lblWhats: 'WhatsApp', lblPhone: 'Teléfono', lblEmail: 'Correo', lblDir: 'Dirección',
      address: 'San Francisco de Heredia, 25 m sur de Autos Bolaños',
      mailSubject: 'Consulta desde el sitio web — ',
    },
    footer: { tagline: 'Psicóloga Clínica · Heredia, Costa Rica', rights: 'Todos los derechos reservados.', code: 'Código profesional 10856' },
  },
  en: {
    nav: { inicio: 'Home', sobre: 'About', servicios: 'Services', psico: 'Assessments', contacto: 'Contact' },
    sub: { inicio: 'Welcome', sobre: 'Get to know me', servicios: 'Support', psico: 'Assessment', contacto: 'Let’s talk' },
    cta: 'Book a session',
    waText: 'Hi Valeria, I would like to book a session.',
    hero: {
      eyebrow: 'Clinical Psychologist · Heredia, Costa Rica',
      title: 'A warm space to care for your emotional well-being.',
      sub: 'Clinical psychology for adults, teens and children. Individual, couples and child therapy with a human, close and professional approach.',
      primary: 'Book via WhatsApp', secondary: 'Learn more',
      cred: 'Costa Rica Board of Professional Psychologists · License 10856',
      frameTitle: 'Professional portrait', frameHint: 'Valeria’s photo will go here',
      badge: 'Licensed Psychologist · UNIBE',
      chips: ['Anxiety', 'Depression', 'Grief', 'Self-esteem', 'Couples', 'Childhood', 'Emotions', 'Crisis'],
    },
    sobre: {
      eyebrow: 'About me', title: 'Valeria Vindas Salas, Psychologist',
      p1: 'I am a clinical psychologist in Heredia, Costa Rica, and a member of the Costa Rica Board of Professional Psychologists (License 10856).',
      p2: 'With a degree in Psychology from Universidad de Iberoamérica (UNIBE), I support adults, teens and children through individual, couples and child therapy, psychological assessment and crisis intervention.',
      p3: 'My approach is human and close: a safe space where you feel heard and accompanied, to restore and strengthen your emotions.',
      frameTitle: 'Photo of Valeria', frameHint: 'Space reserved for your portrait',
      formacionTitle: 'Education', expTitle: 'Experience',
      formacion: [
        { t: 'Licentiate in Psychology', s: 'Universidad de Iberoamérica (UNIBE) · Costa Rica' },
        { t: 'Bachelor in Psychology', s: 'Universidad de Iberoamérica (UNIBE) · Costa Rica' },
        { t: 'Professional license', s: 'Costa Rica Board of Psychologists · License 10856' },
      ],
      exp: [
        { t: 'Dr. Gonzalo Adís Castro Neuro-Psychological Center', s: 'Rational Emotive Therapy, psychological assessment and therapy with children, teens and adults.' },
        { t: 'Rehabilitation Shelter Association', s: 'Psychological support for older adults: individual and group therapy, life stories.' },
      ],
    },
    servicios: {
      eyebrow: 'Services', title: 'Support for every stage',
      sub: 'Psychological therapy tailored to your needs, in a confidential and safe space.',
      moreTitle: 'Also available', areasTitle: 'Areas of focus',
      items: [
        { tone: 'coral', icon: 'individual', d: 'Adults & teens', t: 'Individual Therapy', body: 'A personal space to work through anxiety, depression, grief, self-esteem and emotional regulation.', meta: '55 min – 1 h per session' },
        { tone: 'sage', icon: 'pareja', d: 'Bonds & communication', t: 'Couples Therapy', body: 'Support to strengthen communication, resolve conflict and rebuild connection.', meta: '1 h per session' },
        { tone: 'gold', icon: 'infantil', d: 'Girls & boys', t: 'Child Therapy', body: 'Emotional and behavioral support through play and age-adapted techniques.', meta: 'Adapted session' },
      ],
      more: ['Workshops', 'Group therapy', 'Crisis intervention', 'Assessment'],
      areas: ['Anxiety', 'Depression', 'Grief', 'Phobias', 'Self-esteem', 'Stress', 'Emotions', 'Relationships', 'Crisis'],
    },
    psico: {
      eyebrow: 'Assessments', title: 'Psychological assessment, professionally backed',
      sub: 'Administration, scoring and feedback of standardized psychological assessments.',
      note: 'Every process includes administration, scoring and a careful feedback of the results.',
      groups: [
        { cat: 'Intelligence', items: [ { code: 'WPPSI', name: 'Wechsler Scale for preschool' }, { code: 'WISC-V', name: 'Wechsler Scale for children' }, { code: 'WAIS-IV', name: 'Wechsler Scale for adults' } ] },
        { cat: 'Personality', items: [ { code: 'MMPI', name: 'Minnesota Multiphasic Personality Inventory' } ] },
        { cat: 'Child development', items: [ { code: 'EDIN', name: 'Child growth & development assessment' } ] },
        { cat: 'Child emotional', items: [ { code: 'CMASR-2', name: 'Manifest anxiety scale for children' }, { code: 'CDI', name: 'Children’s depression inventory' } ] },
      ],
    },
    contacto: {
      eyebrow: 'Contact', title: 'Let’s schedule your session',
      sub: 'Message me on WhatsApp or fill out the form. I’ll gladly get back to you.',
      waBtn: 'Message on WhatsApp', formTitle: 'Send a message',
      f_name: 'Name', f_email: 'Email', f_msg: 'How can I help you?', f_send: 'Send message',
      mapTitle: 'Office', mapBtn: 'View on Google Maps', region: 'Heredia, Costa Rica',
      lblWhats: 'WhatsApp', lblPhone: 'Phone', lblEmail: 'Email', lblDir: 'Address',
      address: 'San Francisco de Heredia, 25 m south of Autos Bolaños',
      mailSubject: 'Website inquiry — ',
    },
    footer: { tagline: 'Clinical Psychologist · Heredia, Costa Rica', rights: 'All rights reserved.', code: 'Professional license 10856' },
  },
};

/**
 * Servicio de internacionalización ES/EN con signals. Reemplaza el objeto `STR`
 * y la función `render(lang)` del sitio original: los componentes leen `t()`
 * (computed por idioma) y el botón de la barra llama `toggle()`.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>('es');
  readonly t = computed<Strings>(() => STR[this.lang()]);

  toggle(): void {
    this.lang.update((l) => (l === 'es' ? 'en' : 'es'));
  }
}
