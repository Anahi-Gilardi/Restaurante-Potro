export const RECIPES_DETAILS: Record<string, { pasos_preparacion: string[]; alergenos: string[]; consejo_emplatado: string }> = {
  prod_ent_carpaccio: {
    pasos_preparacion: [
      'Cortar el lomo curado en láminas ultrafinas con la cortadora de fiambres fría.',
      'Disponer las láminas en forma de abanico en el plato frío sin encimarlas demasiado.',
      'Distribuir homogéneamente las alcaparras escurridas y las lascas de queso parmesano.',
      'Terminar rociando con el hilo de aceite de oliva trufado en forma de espiral.'
    ],
    alergenos: ['Lácteos'],
    consejo_emplatado: 'Servir en plato plano negro pre-enfriado para resaltar el color de la carne curada.'
  },
  prod_ent_burrata: {
    pasos_preparacion: [
      'Retirar la burrata de su suero y escurrir sobre papel absorbente.',
      'Colocar una base de tomates confitados templados en el centro del plato hondo.',
      'Asentar la burrata sobre la cama de tomates confitados.',
      'Decorar alrededor con cucharadas de pesto fresco de albahaca y trazar líneas con la reducción de aceto balsámico.'
    ],
    alergenos: ['Lácteos', 'Frutos Secos'],
    consejo_emplatado: 'Utilizar plato hondo rústico de de cerámica clara. Témpera la burrata a temperatura ambiente 10 min antes.'
  },
  prod_ent_mollejas: {
    pasos_preparacion: [
      'Cortar las mollejas previamente blanqueadas en rodajas de 1.5 cm.',
      'Dorar en sartén de hierro bien caliente con manteca y aceite hasta que estén crocantes.',
      'Agregar la cebolla de verdeo picada fina y rehogar 1 minuto.',
      'Desglasar con el vino blanco Chardonnay, reducir a la mitad y agregar crema de leche. Cocinar hasta espesar.'
    ],
    alergenos: ['Lácteos'],
    consejo_emplatado: 'Servir en cazuela de barro precalentada para retener la temperatura de la salsa de crema.'
  },
  prod_ent_provoleta: {
    pasos_preparacion: [
      'Espolvorear la provoleta fría con harina por ambas caras.',
      'Llevar a la plancha a alta temperatura o al horno a leña en una provoletera de hierro fundido.',
      'Dar vuelta cuando forme costra dorada y crocante de un lado.',
      'Retirar, decorar con orégano fresco, tomates secos rehidratados y un chorrito de aceite de oliva.'
    ],
    alergenos: ['Lácteos', 'Gluten'],
    consejo_emplatado: 'Servir directamente sobre la provoleta caliente de hierro apoyada sobre una base de madera.'
  },
  prod_ent_empanadas: {
    pasos_preparacion: [
      'Pintar las empanadas rellenas con huevo batido.',
      'Hornear en el horno a leña precalentado a 250°C durante 8 a 10 minutos.',
      'Rotar las empanadas a mitad de cocción para lograr un dorado parejo y burbujeante.'
    ],
    alergenos: ['Gluten', 'Huevo'],
    consejo_emplatado: 'Servir en una canasta de mimbre o plato de madera criollo con una servilleta de tela rústica.'
  },
  prod_pas_rotolo: {
    pasos_preparacion: [
      'Estirar la masa de huevo a 1mm y disponer el relleno de cabrito desmechado cocido a baja temperatura.',
      'Enrollar en forma cilíndrica (rotolo) y envolver en papel manteca.',
      'Hervir en agua con sal durante 10 minutos.',
      'Retirar el envoltorio, cortar rodajas de 4 cm y dorar levemente en una sartén con manteca noisette.'
    ],
    alergenos: ['Gluten', 'Huevo'],
    consejo_emplatado: 'Servir en plato hondo amplio, salseado con la reducción del propio jugo de cocción del cabrito.'
  },
  prod_pas_cintas_sepia: {
    pasos_preparacion: [
      'Cocinar las cintas de tinta de sepia en agua hirviendo con abundante sal por 3 minutos.',
      'En sartén aparte, dorar langostinos, calamares y mejillones en aceite de oliva virgen.',
      'Incorporar tomates cherry cortados a la mitad, ajo picado y desglasar con vino blanco.',
      'Colar las pastas e incorporarlas a la sartén de mariscos, saltear por 1 minuto emulsionando el líquido de cocción.'
    ],
    alergenos: ['Gluten', 'Moluscos', 'Crustáceos'],
    consejo_emplatado: 'Servir en plato hondo rústico de color blanco para generar un fuerte contraste visual con las pastas negras.'
  },
  prod_pas_sorrentinos_cordero: {
    pasos_preparacion: [
      'Hervir los sorrentinos congelados en abundante agua hirviendo con sal durante 5 a 6 minutos.',
      'Mientras tanto, hidratar los hongos de pino y saltearlos con manteca, ajo y crema de leche suave.',
      'Escurrir los sorrentinos con espumadera con cuidado para evitar roturas.',
      'Volcar los sorrentinos en la salsa de hongos de pino y saltear a fuego mínimo por 1 minuto para homogeneizar.'
    ],
    alergenos: ['Gluten', 'Huevo', 'Lácteos'],
    consejo_emplatado: 'Servir en plato hondo amplio, decorado con perejil fresco picado y láminas finas de queso parmesano.'
  },
  prod_pas_ravioles_calabaza: {
    pasos_preparacion: [
      'Hervir los ravioles en abundante agua salada durante 4 a 5 minutos.',
      'En una sartén, calentar la crema de leche y disolver a fuego lento el queso azul.',
      'Escurrir los ravioles y mezclarlos suavemente con la crema de queso azul en la sartén.',
      'Retirar del fuego y añadir las almendras fileteadas y tostadas por encima.'
    ],
    alergenos: ['Gluten', 'Huevo', 'Lácteos', 'Frutos Secos'],
    consejo_emplatado: 'Emplatar en plato hondo rústico espolvoreando nueces trituradas en el contorno.'
  },
  prod_pas_gnocchis: {
    pasos_preparacion: [
      'Cocinar los gnocchis de papa en agua hirviendo salada hasta que floten (aproximadamente 2 minutos).',
      'En una sartén grande, calentar la salsa pomodoro casera a fuego medio.',
      'Pasar los gnocchis escurridos directamente a la sartén con la salsa pomodoro y saltear rápidamente.',
      'Servir en el plato caliente y coronar en el centro con la stracciatella fresca a temperatura ambiente.'
    ],
    alergenos: ['Gluten', 'Lácteos'],
    consejo_emplatado: 'Emplatar en cazuela de cerámica oscura para destacar el rojo de la salsa y el blanco de la stracciatella.'
  },
  prod_car_ojo_bife: {
    pasos_preparacion: [
      'Marcar el ojo de bife a la parrilla sobre brasas de leña fuerte para sellar.',
      'Cocinar al punto solicitado por el cliente (Jugoso: 52°C interno; A punto: 57°C; Cocido: 63°C).',
      'En cazo aparte, calentar el puré de papa andina con manteca y crema. Incorporar el queso fontina y mozzarella rallados.',
      'Trabajar vigorosamente el puré en caliente con cuchara de madera hasta lograr la textura elástica (hilo del aligot).'
    ],
    alergenos: ['Lácteos'],
    consejo_emplatado: 'Servir la carne trinchada de lado y verter el aligot caliente al momento frente al cliente en plato rústico.'
  },
  prod_car_bife_madurado: {
    pasos_preparacion: [
      'Atemperar el bife madurado a temperatura ambiente por 20 minutos antes de llevar a la cocción.',
      'Cocinar a la parrilla de carbón y leña, preferentemente jugoso para conservar la terneza e intensidad.',
      'Salpimentar al dar vuelta la carne con sal en escamas.',
      'Grillar vegetales seleccionados (morrones, cebollas y calabazas) pincelados con aceite de ajo.'
    ],
    alergenos: [],
    consejo_emplatado: 'Presentar sobre tabla de madera de quebracho curada. Colocar un cuenco con sal en escamas al costado.'
  },
  prod_car_costillar: {
    pasos_preparacion: [
      'Retirar la porción de costillar envasada al vacío de la cámara fría.',
      'Regenerar en horno de vapor o baño maría térmico a 75°C durante 15 minutos.',
      'Terminar en horno de leña a alta temperatura por 3 minutos para dorar la superficie exterior y lograr textura crocante.'
    ],
    alergenos: [],
    consejo_emplatado: 'Servir en una bandeja de metal ovalada vintage con su propio jugo reducido vertido por encima.'
  },
  prod_car_entrana: {
    pasos_preparacion: [
      'Limpiar el exceso de grasa y la membrana exterior de la entraña.',
      'Cocinar a fuego muy fuerte a la parrilla, aproximadamente 6-8 minutos por lado.',
      'Al dar vuelta, salar y bañar ligeramente con chimichurri.',
      'Cortar las papas rústicas en cuñas, saltear con romero fresco y aceite de oliva.'
    ],
    alergenos: [],
    consejo_emplatado: 'Servir la entraña cortada al sesgo en una tabla de madera rústica con las papas en un montículo al lado.'
  },
  prod_car_matambrito: {
    pasos_preparacion: [
      'Tiernizar el matambre de cerdo hirviéndolo en leche con hierbas durante 30 minutos.',
      'Llevar a la parrilla a fuego medio para dorar y desengrasar.',
      'En una sartén, reducir crema de leche con abundante cebolla de verdeo cortada al bies.',
      'Bañar el matambre con la crema de verdeo caliente justo antes de retirar de la parrilla.'
    ],
    alergenos: ['Lácteos'],
    consejo_emplatado: 'Servir en plato ovalado amplio de loza blanca, salseando generosamente.'
  },
  prod_pes_salmon: {
    pasos_preparacion: [
      'Pintar la parte superior del filet de salmón con clara de huevo y rebozar con el mix de sésamo blanco y negro.',
      'Sellar en plancha bien caliente por el lado de las semillas durante 2 minutos hasta dorar.',
      'Dar vuelta y terminar la cocción por 4 minutos a fuego medio (debe quedar rosado y jugoso en el centro).',
      'Blanquear los espárragos y saltearlos rápidamente con manteca.'
    ],
    alergenos: ['Pescado', 'Sésamo', 'Huevo', 'Lácteos'],
    consejo_emplatado: 'Disponer el colchón de espárragos en el centro, asentar el salmón encima y rodear con gotas de emulsión de limón.'
  },
  prod_pes_abadejo: {
    pasos_preparacion: [
      'Sellar el filet de abadejo harinado en aceite caliente hasta dorar ambas caras.',
      'En una sartén pequeña, dorar las láminas de ajo con el ají panca y aceite de oliva.',
      'Colocar el abadejo en una fuente, bañar con el aceite de ajos caliente.',
      'Acompañar con papas hervidas al vapor cortadas en rodajas gruesas.'
    ],
    alergenos: ['Pescado', 'Gluten'],
    consejo_emplatado: 'Servir en plato llano amplio con el abadejo salseado en el centro y las papas al vapor al rededor.'
  },
  prod_pos_flan: {
    pasos_preparacion: [
      'Colocar en la base del molde el caramelo líquido hecho a base de azúcar quemada.',
      'Mezclar huevos frescos, leche entera y azúcar sin batir en exceso para evitar burbujas de aire.',
      'Colar la preparación y verterla suavemente sobre el molde con caramelo.',
      'Cocinar a baño maría en el horno a 140°C durante 50 a 60 minutos. Enfriar por al menos 4 horas antes de desmoldar.'
    ],
    alergenos: ['Huevo', 'Lácteos'],
    consejo_emplatado: 'Servir una porción generosa acompañada con una quenelle de dulce de leche repostero y crema batida.'
  },
  prod_pos_volcan: {
    pasos_preparacion: [
      'Derretir chocolate amargo 70% con manteca premium a baño maría.',
      'Batir huevos y yemas con azúcar a blanco, luego incorporar el chocolate fundido tibio.',
      'Tamizar e incorporar suavemente la harina de trigo.',
      'Llenar moldes individuales enmantecados y espolvoreados con cacao. Hornear a 200°C por exactamente 8 minutos para conservar el centro líquido.'
    ],
    alergenos: ['Gluten', 'Huevo', 'Lácteos'],
    consejo_emplatado: 'Desmoldar en caliente en el centro del plato, espolvorear azúcar impalpable y colocar una bocha de helado de crema americana al costado.'
  }
};
