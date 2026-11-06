import { SPACES } from '../../shared/content';

type SpaceSlug = (typeof SPACES)[number][0];

const PHOTOS: Partial<Record<SpaceSlug, string>> = {
  'aquario-lagoa': 'AquarioLagoa',
  'aquario-marinho': 'AquarioMarinho',
  'aquario-praia': 'AquarioPraia',
  'diorama-manguezal': 'Manguezal',
  'diorama-restinga': 'Restinga',
  'diorama-mata-atlantica': 'MataAtlantica1',
  'diorama-mata-atlantica-2': 'MataAtlantica2',
};

export function spaceCover(slug: SpaceSlug) {
  const photo = PHOTOS[slug];
  return {
    src: photo ? `imagens/${photo}.jpeg` : `${slug}.svg`,
    illustration: !photo,
    label: photo ? 'Fotografia' : 'Ilustração',
  };
}
