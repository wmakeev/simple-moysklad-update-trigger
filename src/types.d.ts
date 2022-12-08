type AttributeMetadataCollection = import('moysklad-api-model').Collection<
  import('moysklad-api-model').AttributeMetadata
>

type Entity = import('moysklad-api-model').Entity

type EntityAttributePatch = {
  meta: import('moysklad-api-model').Meta
  attributes: import('moysklad-api-model').AttributePatch[]
}
