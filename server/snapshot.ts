import os from 'os'
import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import { Answers, saoPrompts } from './common/prompts'
import { generate } from './service/generate'

const excludedList = {
  prismaDB: ['postgresql'],
  typeormDB: ['postgres', 'mongodb', 'mssql', 'mariadb', 'cockroachdb']
}

const createAnswersList = (
  answers: Answers,
  [nextQuestion, ...leftQuestions]: typeof saoPrompts
): Answers[] => {
  if (nextQuestion.name === 'pm' || nextQuestion.when?.(answers) === false) {
    return leftQuestions.length
      ? createAnswersList(answers, leftQuestions)
      : [answers]
  }

  if (nextQuestion.type === 'input') {
    const ans = { ...answers }

    if (nextQuestion.default) {
      ans[nextQuestion.name] =
        typeof nextQuestion.default === 'string'
          ? nextQuestion.default
          : nextQuestion.default(ans)
    } else {
      ans[nextQuestion.name] = nextQuestion.name
    }

    return leftQuestions.length ? createAnswersList(ans, leftQuestions) : [ans]
  }

  return nextQuestion.choices
    .filter(
      (choice) =>
        !excludedList[nextQuestion.name as keyof typeof excludedList]?.includes(
          choice.value
        )
    )
    .reduce<Answers[]>((prev, choice) => {
      const ans = {
        ...answers,
        dir: `${answers.dir}${answers.dir ? '-' : ''}${choice.value}`,
        [nextQuestion.name]: choice.value
      }
      return [
        ...prev,
        ...(leftQuestions.length
          ? createAnswersList(ans, leftQuestions)
          : [ans])
      ]
    }, [])
}

const promptsList = createAnswersList({ dir: '' }, saoPrompts.slice(1))
console.log(promptsList.length)

const outputDir = path.join(os.tmpdir(), `${Date.now()}`)
const listFiles = (targetDir: string): string[] =>
  fs
    .readdirSync(targetDir, { withFileTypes: true })
    .reduce<string[]>((prev, dirent) => {
      const target = path.posix.join(targetDir, dirent.name)
      return [...prev, ...(dirent.isFile() ? [target] : listFiles(target))]
    }, [])

;(async () => {
  fs.mkdirSync(outputDir)

  for (let i = 0; i < promptsList.length; i += 1) {
    if (i % 100 === 0) console.log(i)

    await generate(
      {
        ...promptsList[i],
        clientPort: 3000,
        serverPort: 8080
      },
      path.resolve(outputDir, promptsList[i].dir ?? '')
    )
  }

  const allFiles = listFiles(outputDir)
  console.log(allFiles.length)
  let text = ''
  for (let i = 0; i < allFiles.length; i += 1) {
    text += `=== ${allFiles[i].replace(`${outputDir}/`, '')} ===
${allFiles[i].endsWith('png') ? 'binary' : fs.readFileSync(allFiles[i], 'utf8')}
`
  }
  fs.writeFileSync(path.join(__dirname, '__test__/snapshot.txt'), text, 'utf8')

  rimraf.sync(outputDir)
})()
