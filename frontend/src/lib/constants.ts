import { Field } from '@/types';

export const APP_NAME = 'Physics Lab';

export const SAMPLE_FIELDS: Field[] = [
  {
    id: '1',
    name: 'Mechanics',
    description: 'Study of motion, forces, and energy',
    icon: '⚙️',
    color: 'bg-blue-500',
    slug: 'mechanics'
  },
  {
    id: '2',
    name: 'Thermodynamics',
    description: 'Heat, energy, and temperature',
    icon: '🔥',
    color: 'bg-red-500',
    slug: 'thermodynamics'
  },
  {
    id: '3',
    name: 'Electromagnetism',
    description: 'Electric and magnetic fields',
    icon: '⚡',
    color: 'bg-purple-500',
    slug: 'electromagnetism'
  },
  {
    id: '4',
    name: 'Optics',
    description: 'Light and its properties',
    icon: '💡',
    color: 'bg-yellow-500',
    slug: 'optics'
  },
  {
    id: '5',
    name: 'Quantum Physics',
    description: 'Quantum mechanics and particles',
    icon: '🌌',
    color: 'bg-indigo-500',
    slug: 'quantum-physics'
  },
  {
    id: '6',
    name: 'Relativity',
    description: 'Einstein\'s theories of relativity',
    icon: '🌍',
    color: 'bg-green-500',
    slug: 'relativity'
  }
]; 