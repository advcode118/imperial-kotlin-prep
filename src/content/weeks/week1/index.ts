import { buildWeek } from '../../load'

const yaml = import.meta.glob('./**/*.yaml', { eager: true, import: 'default' })
const raw = import.meta.glob('./preppt/files/**/*', { eager: true, query: '?raw', import: 'default' })

export const week1 = buildWeek({ ...yaml, ...raw })
