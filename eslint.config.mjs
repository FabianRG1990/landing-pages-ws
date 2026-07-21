import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:acuario',
              onlyDependOnLibsWithTags: ['scope:acuario', 'scope:shared'],
            },
            {
              sourceTag: 'scope:arias',
              onlyDependOnLibsWithTags: ['scope:arias', 'scope:shared'],
            },
            {
              sourceTag: 'scope:vindas',
              onlyDependOnLibsWithTags: ['scope:vindas', 'scope:shared'],
            },
            {
              sourceTag: 'scope:velox',
              onlyDependOnLibsWithTags: ['scope:velox', 'scope:shared'],
            },
            {
              sourceTag: 'scope:interiorismo',
              onlyDependOnLibsWithTags: ['scope:interiorismo', 'scope:shared'],
            },
            {
              sourceTag: 'scope:cafe-rosa',
              onlyDependOnLibsWithTags: ['scope:cafe-rosa', 'scope:shared'],
            },
            {
              sourceTag: 'scope:aros-alex',
              onlyDependOnLibsWithTags: ['scope:aros-alex', 'scope:shared'],
            },
            {
              sourceTag: 'scope:automotivo',
              onlyDependOnLibsWithTags: ['scope:automotivo', 'scope:shared'],
            },
            {
              sourceTag: 'scope:orden-de-trabajo-automotriz',
              onlyDependOnLibsWithTags: [
                'scope:orden-de-trabajo-automotriz',
                'scope:shared',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
