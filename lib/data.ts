
import { NivelEducativo, Asignatura, EjeTematico, Unidad, ObjetivoAprendizaje, Habilidad, NivelCognitivo, Colegio, Profesional } from '../types';

export const ADMIN_RUT = '10851312-0';

export const PROFESIONALES_DATA: Profesional[] = [
  { id: '10851312-8', rut: '10851312-8', nombres: 'Gonzalo', apellidoPaterno: 'Villarreal', apellidoMaterno: 'Farah', nombreCompleto: 'Gonzalo Villarreal Farah', email: 'gonzalo.villarreal@centrocomenius.org' },
  { id: '10163922-3', rut: '10163922-3', nombres: 'Patricia', apellidoPaterno: 'Orellana', apellidoMaterno: 'Rozas', nombreCompleto: 'Patricia Orellana Rozas', email: 'patricia.orellana@centrocomenius.org' },
  { id: '12264734-K', rut: '12264734-K', nombres: 'Mauricio Esteban', apellidoPaterno: 'Moya', apellidoMaterno: 'Márquez', nombreCompleto: 'Mauricio Moya Márquez', email: 'mauricio.moya@centrocomenius.org' },
  { id: '10765472-0', rut: '10765472-0', nombres: 'Manuel Alejandro', apellidoPaterno: 'Galaz', apellidoMaterno: 'Pérez', nombreCompleto: 'Manuel Galaz Pérez', email: 'manuel.galaz@centrocomenius.org' },
  { id: '10054125-4', rut: '10054125-4', nombres: 'Giovanni Leonardo', apellidoPaterno: 'Pierattini', apellidoMaterno: 'Meza', nombreCompleto: 'Giovanni Pierattini Meza', email: 'glpierattini@gmail.com' },
];

export const NIVELES_EDUCATIVOS: NivelEducativo[] = ['1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico'];

export const ASIGNATURAS: { [key in NivelEducativo]: Asignatura[] } = {
  '1° Básico': ['Matemática', 'Lenguaje y Comunicación'],
  '2° Básico': ['Matemática', 'Ciencias Naturales', 'Lenguaje y Comunicación', 'Historia, Geografía y Cs. Sociales'],
  '3° Básico': ['Matemática', 'Lenguaje y Comunicación', 'Ciencias Naturales'],
  '4° Básico': ['Matemática', 'Historia, Geografía y Cs. Sociales'],
  '5° Básico': ['Matemática'],
  '6° Básico': ['Matemática'],
};

export const COLEGIOS_DATA: Colegio[] = [
  {
    id: 'escuela-guillermo-zanartu-irigoyen',
    nombre: 'Escuela Guillermo Zañartu Irigoyen',
    docentes: [
      { id: '15581560-4', nombres: 'Daniela', apellidoPaterno: 'Rojas', apellidoMaterno: 'Bustamante', nombreCompleto: 'Daniela Rojas Bustamante', rut: '15581560-4', email: 'daniela.rojas@edununoa.cl', curso: 'A' },
      { id: '19783074-3', nombres: 'Michelle', apellidoPaterno: 'Jofré', apellidoMaterno: 'Alquinta', nombreCompleto: 'Michelle Jofré Alquinta', rut: '19783074-3', email: 'michelle.jofre.a@edununoa.cl', curso: 'B' }
    ]
  },
  {
    id: 'colegio-benjamin-claro-velasco',
    nombre: 'Colegio Benjamín Claro Velasco',
    docentes: [
      { id: '17.483.938-7', nombres: 'Valentina Ignacia de los', apellidoPaterno: 'Palominos', apellidoMaterno: 'Jimenez', nombreCompleto: 'Valentina Palominos Jimenez', rut: '17.483.938-7', email: 'valentina.palominos@edununoa.cl', curso: 'A' },
      { id: 'paula-aravena', nombres: 'Paula', apellidoPaterno: 'Aravena', apellidoMaterno: '', nombreCompleto: 'Paula Aravena (Reemplazo)', rut: 'N/A', email: 'paula.aravena@gmail.com', curso: 'A' },
      { id: '14.005.418-6', nombres: 'Carol Yanina', apellidoPaterno: 'Caroca', apellidoMaterno: 'Vega', nombreCompleto: 'Carol Caroca Vega', rut: '14.005.418-6', email: 'carol.caroca@edununoa.cl', curso: 'B' }
    ],
    jefesTecnicos: [
        { id: '17.271.888-4', rut: '17.271.888-4', nombreCompleto: 'Camila Otero López', email: 'camila.otero@cmdsnunoa.cl' }
    ]
  },
  {
    id: 'colegio-republica-de-costa-rica',
    nombre: 'Colegio República de Costa Rica',
    docentes: [
      { id: '16.798.367-7', nombres: 'Ingrid Elena', apellidoPaterno: 'Parra', apellidoMaterno: 'Albornoz', nombreCompleto: 'Ingrid Parra Albornoz', rut: '16.798.367-7', email: 'ingrid.parra@edununoa.cl', curso: 'A' },
      { id: '16.923.819-7', nombres: 'Jacqueline Verónica', apellidoPaterno: 'Cáceres', apellidoMaterno: 'Silva', nombreCompleto: 'Jacqueline Cáceres Silva', rut: '16.923.819-7', email: 'jacqueline.caceres@edununoa.cl', curso: 'B' }
    ]
  },
  {
    id: 'escuela-intercultural-kallfu-mapu',
    nombre: 'Escuela Intercultural Kallfu Mapu',
    docentes: [
      { id: '15.419.376-6', nombres: 'Beatriz', apellidoPaterno: 'Bascur', apellidoMaterno: 'Andrade', nombreCompleto: 'Beatriz Bascur Andrade', rut: '15.419.376-6', email: 'beatriz.bascur@edununoa.cl', curso: 'A' },
      { id: 'angie-guinez', nombres: 'Angie', apellidoPaterno: 'Guiñez', apellidoMaterno: 'Beltrán', nombreCompleto: 'Angie Guiñez Beltrán (Coord.)', rut: 'N/A', email: 'angie.guinez@edununoa.cl', curso: 'A' }
    ]
  },
  {
    id: 'colegio-juan-moya-morales',
    nombre: 'Colegio Juan Moya Morales',
    docentes: [
      { id: '20.198.186-7', nombres: 'Pilar', apellidoPaterno: 'Aguayo', apellidoMaterno: 'De la Jara', nombreCompleto: 'Pilar Aguayo De la Jara', rut: '20.198.186-7', email: 'pilar.aguayo.jmm@edununoa.cl', curso: 'A' },
      { id: '9.079.590-2', nombres: 'Mónica', apellidoPaterno: 'Tobar', apellidoMaterno: 'Hormazabal', nombreCompleto: 'Mónica Tobar Hormazabal', rut: '9.079.590-2', email: 'monica.tobar.jmm@edununoa.cl', curso: 'B' }
    ]
  },
  {
    id: 'liceo-republica-de-siria',
    nombre: 'Liceo República de Siria',
    docentes: [
      { id: '18.466.866-1', nombres: 'Camila Inés', apellidoPaterno: 'De La Fuente', apellidoMaterno: 'Donos', nombreCompleto: 'Camila De La Fuente Donos', rut: '18.466.866-1', email: 'camia.delafuente@colegiosiria.cl', curso: 'A' },
      { id: '16.208.923-4', nombres: 'Verónica Alejandra', apellidoPaterno: 'Vallejos', apellidoMaterno: 'Gálvez', nombreCompleto: 'Verónica Vallejos Gálvez', rut: '16.208.923-4', email: 'veronica.vallejos@colegiosiria.cl', curso: 'B' },
      { id: '16.121.964-9', nombres: 'Paz Alejandra', apellidoPaterno: 'Almeyda', apellidoMaterno: 'Vargas', nombreCompleto: 'Paz Almeyda Vargas', rut: '16.121.964-9', email: 'paz.almeyda@colegiosiria.cl', curso: 'C' },
      { id: '17.302.369-3', nombres: 'Camila Francisca', apellidoPaterno: 'Correa', apellidoMaterno: 'Moraga', nombreCompleto: 'Camila Correa Moraga', rut: '17.302.369-3', email: 'camila.correa@colegiosiria.cl', curso: 'D' }
    ],
    jefesTecnicos: [
        { id: '8.338.580-4', rut: '8.338.580-4', nombreCompleto: 'Marcela Silva', email: 'marcela.silva@colegiosiria.cl' }
    ]
  },
  {
    id: 'colegio-jose-toribio-medina',
    nombre: 'Colegio José Toribio Medina',
    docentes: [
      { id: '15.562.777-7', nombres: 'Walter Eduard', apellidoPaterno: 'Valdebenito', apellidoMaterno: 'Fuentes', nombreCompleto: 'Walter Valdebenito Fuentes', rut: '15.562.777-7', email: 'Walter.valdebenito@edununoa.cl', curso: 'A y B' }
    ]
  },
  {
    id: 'colegio-presidente-eduardo-frei-m',
    nombre: 'Colegio Presidente Eduardo Frei M.',
    docentes: [
      { id: '16357286-9', nombres: 'Alejandra', apellidoPaterno: 'Espinoza', apellidoMaterno: 'Acuña', nombreCompleto: 'Alejandra Espinoza Acuña', rut: '16357286-9', email: 'Alejandra.espinoza@edununoa.cl', curso: 'A' },
      { id: '12963224-0', nombres: 'Patricia', apellidoPaterno: 'Flores', apellidoMaterno: 'Guzmán', nombreCompleto: 'Patricia Flores Guzmán', rut: '12963224-0', email: 'patricia.flores@edununoa.cl', curso: 'B' },
      { id: '9993612-6', nombres: 'Paula', apellidoPaterno: 'Baeza', apellidoMaterno: 'Maturana', nombreCompleto: 'Paula Baeza Maturana', rut: '9993612-6', email: 'paula.baeza@edununoa.cl', curso: 'C' }
    ]
  },
  {
    id: 'colegio-republica-de-francia',
    nombre: 'Colegio República de Francia',
    docentes: [
      { id: '15.916.961-8', nombres: 'Daniela Bernardita', apellidoPaterno: 'De Borguie', apellidoMaterno: 'Vejar', nombreCompleto: 'Daniela De Borguie Vejar', rut: '15.916.961-8', email: 'daniela.deborguie@colegiorepublicadefran', curso: 'A' }
    ]
  },
  {
    id: 'liceo-lenka-franulic',
    nombre: 'Liceo Lenka Franulic',
    docentes: [
      { id: '9.571.219-3', nombres: 'María Eugenia', apellidoPaterno: 'Matus', apellidoMaterno: 'Henríquez', nombreCompleto: 'María Eugenia Matus Henríquez', rut: '9.571.219-3', email: 'mariaeugenia.matus.henriquez@edununoa.cl', curso: 'A' },
      { id: '15.537.003-3', nombres: 'Leslie', apellidoPaterno: 'Amaral', apellidoMaterno: 'Rojas', nombreCompleto: 'Leslie Amaral Rojas', rut: '15.537.003-3', email: 'leslie.amaral.rojas@edununoa.cl', curso: 'B' }
    ]
  },
  {
    id: 'liceo-carmela-silva-donoso',
    nombre: 'Liceo Carmela Silva Donoso',
    docentes: [
      { id: '18326820-1', nombres: 'Nicolás', apellidoPaterno: 'Cornejo', apellidoMaterno: 'León', nombreCompleto: 'Nicolás Cornejo León', rut: '18326820-1', email: 'n.cornejo@liceolcsd.com', curso: 'A' },
      { id: '18242527-3', nombres: 'Karla', apellidoPaterno: 'Orellana', apellidoMaterno: 'Reyes', nombreCompleto: 'Karla Orellana Reyes', rut: '18242527-3', email: 'k.orellana@liceolcsd.com', curso: 'B' },
      { id: '18913388-k', nombres: 'Lucia', apellidoPaterno: 'Astengo', apellidoMaterno: 'Hurtado', nombreCompleto: 'Lucia Astengo Hurtado', rut: '18913388-k', email: 'l.astengo@liceolcsd.com', curso: 'C' }
    ],
    jefesTecnicos: [
        { id: '16.070.477-2', rut: '16.070.477-2', nombreCompleto: 'Marjorie Pino Morales', email: 'm.pino@liceolcsd.com' }
    ]
  }
];

export const EJES_TEMATICOS: EjeTematico[] = [
  { id: 'e2b-1', nombre: 'Números y Operaciones' },
  { id: 'e2b-2', nombre: 'Patrones y Álgebra' },
  { id: 'e2b-3', nombre: 'Geometría' },
  { id: 'e2b-4', nombre: 'Medición' },
  { id: 'e2b-5', nombre: 'Datos y Probabilidades' },
];

export const UNIDADES: Unidad[] = [
  { id: 'u2m-1', nombre: 'Unidad 1', nivel: '2° Básico', asignatura: 'Matemática' },
  { id: 'u2m-2', nombre: 'Unidad 2', nivel: '2° Básico', asignatura: 'Matemática' },
  { id: 'u2m-3', nombre: 'Unidad 3', nivel: '2° Básico', asignatura: 'Matemática' },
  { id: 'u2m-4', nombre: 'Unidad 4', nivel: '2° Básico', asignatura: 'Matemática' },
];

export const OBJETIVOS_APRENDIZAJE: ObjetivoAprendizaje[] = [
  // Unidad 1
  { id: 'oa-u1-1', codigo: 'OA1', descripcion: 'Contar números del 0 al 1000 de 2 en 2, de 5 en 5, de 10 en 10 y de 100 en 100 hacia adelante y hacia atrás, empezando por cualquier número menor que 1.000.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-2', codigo: 'OA2', descripcion: 'Leer números del 0 al 100 y representarlos en forma concreta, pictórica y simbólica.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-3', codigo: 'OA3', descripcion: 'Comparar y ordenar números del 0 al 100 de menor a mayor y viceversa, usando material concreto, monedas nacionales y/o software educativo.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-4', codigo: 'OA5', descripcion: 'Componer y descomponer de manera aditiva números del 0 al 100, en forma concreta, pictórica y simbólica.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-5', codigo: 'OA6', descripcion: 'Describir y aplicar estrategias de cálculo mental para adiciones y sustracciones hasta 20.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-6', codigo: 'OA7', descripcion: 'Identificar las unidades y decenas en números del 0 al 100, representando las cantidades de acuerdo a su valor posicional, con material concreto, pictórico y simbólico.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-7', codigo: 'OA9', descripcion: 'Demostrar que comprende la adición y la sustracción en el ámbito del 0 al 100.', ejeId: 'e2b-1', unidadId: 'u2m-1' },
  { id: 'oa-u1-8', codigo: 'OA17', descripcion: 'Identificar días, semanas, meses y fechas en el calendario.', ejeId: 'e2b-4', unidadId: 'u2m-1' },

  // Unidad 2
  { id: 'oa-u2-1', codigo: 'OA1', descripcion: 'Contar números del 0 al 1000 de 2 en 2, de 5 en 5, de 10 en 10 y de 100 en 100 hacia adelante y hacia atrás, empezando por cualquier número menor que 1.000.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-2', codigo: 'OA2', descripcion: 'Leer números naturales del 0 al 100 y representarlos en forma concreta, pictórica y simbólica.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-3', codigo: 'OA4', descripcion: 'Estimar cantidades hasta 100 en situaciones concretas, usando un referente.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-4', codigo: 'OA6', descripcion: 'Describir y aplicar estrategias de cálculo mental para adiciones y sustracciones hasta 20.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-5', codigo: 'OA7', descripcion: 'Identificar las unidades y decenas en números del 0 al 100, representando las cantidades de acuerdo a su valor posicional, con material concreto, pictórico y simbólico.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-6', codigo: 'OA10', descripcion: 'Demostrar que comprende la relación entre la adición y la sustracción al usar la "familia de operaciones" en cálculos aritméticos y la resolución de problemas.', ejeId: 'e2b-1', unidadId: 'u2m-2' },
  { id: 'oa-u2-7', codigo: 'OA13', descripcion: 'Demostrar, explicar y registrar la igualdad y desigualdad en forma concreta y pictórica del 0 al 20, usando el símbolo igual (=) y los símbolos no igual (>, <).', ejeId: 'e2b-2', unidadId: 'u2m-2' },
  { id: 'oa-u2-8', codigo: 'OA14', descripcion: 'Representar y describir la posición de objetos y personas con relación a sí mismo y a otros (objetos y personas), incluyendo derecha e izquierda, usando modelos y dibujos.', ejeId: 'e2b-3', unidadId: 'u2m-2' },

  // Unidad 3
  { id: 'oa-u3-1', codigo: 'OA6', descripcion: 'Describir y aplicar estrategias de cálculo mental para adiciones y sustracciones hasta 20.', ejeId: 'e2b-1', unidadId: 'u2m-3' },
  { id: 'oa-u3-2', codigo: 'OA8', descripcion: 'Demostrar y explicar, de manera concreta, pictórica y simbólica, el efecto de sumar y restar 0 a un número.', ejeId: 'e2b-1', unidadId: 'u2m-3' },
  { id: 'oa-u3-3', codigo: 'OA9', descripcion: 'Demostrar que comprende la adición y la sustracción en el ámbito del 0 al 100.', ejeId: 'e2b-1', unidadId: 'u2m-3' },
  { id: 'oa-u3-4', codigo: 'OA15', descripcion: 'Describir, comparar y construir figuras 2D: triángulos, cuadrados, rectángulos y círculos con material concreto.', ejeId: 'e2b-3', unidadId: 'u2m-3' },
  { id: 'oa-u3-5', codigo: 'OA16', descripcion: 'Describir, comparar y construir figuras 3D (cubos, paralelepípedos, esferas y conos) con diversos materiales.', ejeId: 'e2b-3', unidadId: 'u2m-3' },
  { id: 'oa-u3-6', codigo: 'OA19', descripcion: 'Determinar la longitud de objetos, usando unidades de medidas no estandarizadas y unidades estandarizadas (cm y m) en el contexto de la resolución de problemas.', ejeId: 'e2b-4', unidadId: 'u2m-3' },
  { id: 'oa-u3-7', codigo: 'OA20', descripcion: 'Recolectar y registrar datos para responder preguntas estadísticas sobre juegos con monedas y dados, usando bloques y tablas de conteo y pictogramas.', ejeId: 'e2b-5', unidadId: 'u2m-3' },
  
  // Unidad 4
  { id: 'oa-u4-1', codigo: 'OA6', descripcion: 'Describir y aplicar estrategias de cálculo mental para adiciones y sustracciones hasta 20.', ejeId: 'e2b-1', unidadId: 'u2m-4' },
  { id: 'oa-u4-2', codigo: 'OA11', descripcion: 'Demostrar que comprende la multiplicación.', ejeId: 'e2b-1', unidadId: 'u2m-4' },
  { id: 'oa-u4-3', codigo: 'OA12', descripcion: 'Crear, representar y continuar una variedad de patrones numéricos y completar los elementos faltantes, de manera manual y/o usando software educativo.', ejeId: 'e2b-2', unidadId: 'u2m-4' },
  { id: 'oa-u4-4', codigo: 'OA18', descripcion: 'Leer horas y medias horas en relojes digitales en el contexto de la resolución de problemas.', ejeId: 'e2b-4', unidadId: 'u2m-4' },
  { id: 'oa-u4-5', codigo: 'OA21', descripcion: 'Registrar en tablas y gráficos de barra simple, resultados de juegos aleatorios con dados y monedas.', ejeId: 'e2b-5', unidadId: 'u2m-4' },
  { id: 'oa-u4-6', codigo: 'OA22', descripcion: 'Construir, leer e interpretar pictogramas con escala y gráficos de barras simple.', ejeId: 'e2b-5', unidadId: 'u2m-4' },
];

export const NIVELES_COGNITIVOS: NivelCognitivo[] = ['Conocimiento Básico', 'Aplicación', 'Pensamiento Superior'];

export const HABILIDADES: Habilidad[] = [
  // Conocimiento Básico
  { id: 'hab-2', nombre: 'Comprender', nivelCognitivo: 'Conocimiento Básico' },
  { id: 'hab-1', nombre: 'Conocer', nivelCognitivo: 'Conocimiento Básico' },
  
  // Aplicación
  { id: 'hab-7', nombre: 'Analizar', nivelCognitivo: 'Aplicación' },
  { id: 'hab-3', nombre: 'Aplicar', nivelCognitivo: 'Aplicación' },
  { id: 'hab-5', nombre: 'Modelar', nivelCognitivo: 'Aplicación' },
  { id: 'hab-4', nombre: 'Representar', nivelCognitivo: 'Aplicación' },
  { id: 'hab-6', nombre: 'Resolver problemas rutinarios', nivelCognitivo: 'Aplicación' },

  // Pensamiento Superior
  { id: 'hab-10', nombre: 'Argumentar y comunicar', nivelCognitivo: 'Pensamiento Superior' },
  { id: 'hab-8', nombre: 'Sintetizar', nivelCognitivo: 'Pensamiento Superior' },
  { id: 'hab-9', nombre: 'Evaluar', nivelCognitivo: 'Pensamiento Superior' },
  { id: 'hab-11', nombre: 'Resolver problemas no rutinarios', nivelCognitivo: 'Pensamiento Superior' },
];
