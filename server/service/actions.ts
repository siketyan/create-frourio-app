import validate from 'validate-npm-package-name'
import { typeormDBs } from '../common/dbInfo'
import { Answers } from '../common/prompts'

export const createActions = (
  answers: Answers
): {
  answers: Answers & { dbModule: string; dbUrl: string }
  actions: (
    | { type: 'add'; files: string; templateDir: string }
    | { type: 'move'; patterns: Record<string, string> }
  )[]
} => {
  const newAnswers = { ...answers, dbModule: '', dbUrl: '' }
  const validation = validate(answers.dir ?? '')
  validation.warnings &&
    validation.warnings.forEach((warn: string) => {
      console.warn('Warning:', warn)
    })
  validation.errors &&
    validation.errors.forEach((err: string) => {
      console.error('Error:', err)
    })
  validation.errors && validation.errors.length && process.exit(1)

  const addedList: { type: 'add'; files: string; templateDir: string }[] = [
    {
      type: 'add',
      files: '**',
      templateDir: `core/${answers.server}`
    }
  ]

  if (answers.orm === 'typeorm') {
    addedList.push({
      type: 'add',
      files: '**',
      templateDir: `core/${answers.server}-typeorm`
    })
  }

  if (answers.daemon !== 'none') {
    addedList.push({
      type: 'add',
      files: '**',
      templateDir: `daemon/${answers.daemon}`
    })
  }

  newAnswers.dbModule = ''

  if (answers.orm === 'prisma') {
    newAnswers.dbUrl =
      answers.prismaDB === 'sqlite'
        ? `file:${answers.dbFile}`
        : `${answers.prismaDB}://${answers.dbUser}:${answers.dbPass}@${answers.dbHost}:${answers.dbPort}/${answers.dbName}`

    addedList.push({
      type: 'add',
      files: '**',
      templateDir: 'orm/prisma'
    })
  } else if (answers.orm === 'typeorm') {
    newAnswers.dbModule = `",\n    "${
      typeormDBs[answers.typeormDB as keyof typeof typeormDBs].name
    }": "${typeormDBs[answers.typeormDB as keyof typeof typeormDBs].ver}`

    addedList.push({
      type: 'add',
      files: '**',
      templateDir: 'orm/typeorm'
    })
  }

  if (answers.testing !== 'none') {
    addedList.push({
      type: 'add',
      files: '**',
      templateDir: `testing/${answers.testing}`
    })
  }

  return {
    answers: newAnswers,
    actions: [
      {
        type: 'add',
        files: '**',
        templateDir: `client/${answers.client}`
      },
      {
        type: 'add',
        files: 'server/**',
        templateDir: ''
      },
      ...addedList,
      {
        type: 'move',
        patterns: { gitignore: '.gitignore' }
      }
    ]
  }
}
