// @ts-check

import { cleanEnv, str } from 'envalid'
import Moysklad from 'moysklad'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fetch } from 'undici'

const env = cleanEnv(process.env, {
  TRIGGER_FIELD_NAME: str(),
  ENTITIES_IDS_FILE_PATH: str(),
  ENTITY_TYPE: str(),
  TRIGGER_VALUE_JSON: str()
})

const ms = Moysklad({
  fetch,
  userAgent: 'github.com/wmakeev/simple-moysklad-update-trigger'
})

/** @type {AttributeMetadataCollection} */
const attributesMetadataColl = await ms.GET(
  `entity/${env.ENTITY_TYPE}/metadata/attributes`
)

const triggerAttr = attributesMetadataColl.rows.find(
  a => a.name === env.TRIGGER_FIELD_NAME
)

if (!triggerAttr) {
  throw new Error(
    `Не удалось найти пользовательское поле - ${env.TRIGGER_FIELD_NAME}`
  )
}

const docIdsToUpdateJsonStr = await readFile(
  path.join(process.cwd(), env.ENTITIES_IDS_FILE_PATH),
  'utf8'
)

const docIdsToUpdate = JSON.parse(docIdsToUpdateJsonStr)

if (!Array.isArray(docIdsToUpdate) || docIdsToUpdate.length === 0) {
  throw new Error('Пустой список идентификаторов для обновления')
}

// Обновляем не спеша по очереди (никуда не спешим) ...
for (const id of docIdsToUpdate) {
  if (typeof id !== 'string') {
    throw new Error(`Идентификатор должен быть строкой - ${id}`)
  }

  const url = `entity/${env.ENTITY_TYPE}/${id}`

  /** @type {Entity} */
  const entity = await ms.GET(url)

  if (!entity) {
    console.log(`Сущность не найдена по идентификатору - ${id}`)
    continue
  }

  // @ts-expect-error skip typecheck
  const updated = entity['updated']

  console.log(
    `Update ${env.ENTITY_TYPE}(${entity.id})` +
      (updated ? ` (last updated ${updated})` : '')
  )

  /** @type {EntityAttributePatch} */
  const entityPatch = {
    meta: entity.meta,
    attributes: [
      {
        meta: {
          type: 'attributemetadata',
          href: triggerAttr.meta.href
        },
        value: JSON.parse(env.TRIGGER_VALUE_JSON)
      }
    ]
  }

  await ms.PUT(url, entityPatch)

  await setTimeout(100)
}

console.log('DONE.')
