import nbtlint from '../dependencies/nbtlint/docs/nbt-lint'
import {
	safeFunctionName,
	format,
	fixIndent,
	store,
	JsonText,
	cloneObject,
	CustomError,
	translate,
} from '../util'

interface MCBConfig {
	dev: boolean
	header: string
	internalScoreboard: string
	generatedDirectory: string
	rootNamespace?: string
	defaultNamespace?: string
	[index: string]: any
}

async function createMCFile(
	bones: any,
	animations: any,
	ajSettings: any,
	statueExporterSettings: statueExporterSettings,
	variantModels: any,
	variantTextureOverrides: any,
	variantTouchedModels: any
): Promise<string> {
	const FILE: string[] = []
	const projectName = safeFunctionName(ajSettings.projectName)

	const HEAD_Y_OFFSET = -1.813
	if (!statueExporterSettings) HEAD_Y_OFFSET + 0.4

	const staticAnimationUuid = store.get('static_animation_uuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones
	const staticDistance = animations[staticAnimationUuid].maxDistance

	const rootExeErrorJsonText = new JsonText([
		'',
		{ text: 'AJ', color: 'green' },
		{ text: ' ? ', color: 'light_purple' },
		{ text: 'Error ?', color: 'red' },
		'\n',
		{ text: '%functionName', color: 'blue' },
		' ',
		{ text: 'must be executed as ', color: 'gray' },
		{ text: `aj.${projectName}.root`, color: 'light_purple' },
	]).toString()

	const scoreboards = {
		id: statueExporterSettings.idScoreboardObjective,
		internal: statueExporterSettings.internalScoreboardObjective,
	}

	const tags = {
		model: format(statueExporterSettings.modelTag, {
			projectName: projectName,
		}),
		root: format(statueExporterSettings.rootTag, {
			projectName: projectName,
		}),
		allBones: format(statueExporterSettings.allBonesTag, {
			projectName: projectName,
		}),
		individualBone: format(statueExporterSettings.individualBoneTag, {
			projectName: projectName,
		}),
	}

	interface entityTypes {
		bone: string
		root: string
		boneRoot: string
		boneDisplay?: string
	}
	const entityTypes: entityTypes = {
		bone: `#${projectName}:bone_entities`,
		root: 'minecraft:marker',
		boneRoot: 'minecraft:area_effect_cloud',
		boneDisplay: 'minecraft:armor_stand',
	}
	// switch (statueExporterSettings.boneType) {
	// 	case 'aecStack':
	// 		entity_types.bone_root = 'minecraft:area_effect_cloud'
	// 		entity_types.bone_display = 'minecraft:armor_stand'
	// 		break
	// 	default:
	// 		entity_types.bone_root = 'minecraft:armor_stand'
	// 		// entity_types.bone_display = undefined
	// 		break
	// }

	const CONFIG: MCBConfig = {
		dev: false,
		header: '#Code generated by Animated Java (https://animated-java.dev/)',
		internalScoreboard: scoreboards.internal,
		generatedDirectory: 'zzz',
	}

	//? Install Function
	FILE.push(`
	function install {
		${Object.entries(scoreboards)
			.map(([k, v]) => `scoreboard objectives add ${v}`)
			.join('\n')}
	}
	`)

	//? Bone Entity Type
	FILE.push(`
		entities bone_entities {
			${entityTypes.boneRoot}
			${entityTypes.boneDisplay}
		}
	`)

	//? Remove dir
	FILE.push(`
	dir remove {
		function all {
			kill @e[type=${entityTypes.root},tag=${tags.model}]
			kill @e[type=${entityTypes.bone},tag=${tags.model}]
		}
		function this {
			execute (if entity @s[tag=${tags.root}] at @s) {
				scoreboard players operation # ${scoreboards.id} = @s ${scoreboards.id}
				execute as @e[type=${entityTypes.bone},tag=${
		tags.model
	},distance=..${staticDistance}] if score @s ${scoreboards.id} = # ${
		scoreboards.id
	} run kill @s
				kill @s
			} else {
				tellraw @s ${rootExeErrorJsonText.replace(
					'%functionName',
					`${projectName}:remove/all`
				)}
			}
		}
	}
	`)

	//? Summon dir
	const summons: any[] = []
	for (const [boneName, boneFrame] of Object.entries(
		staticFrame as Record<string, any>
	)) {
		if (!boneFrame.exported) continue

		const bone = bones[boneName]
		const nbt = nbtlint.parse(bone.nbt)

		if (!nbt.map.Tags) nbt.add('Tags', new nbtlint.TagList())
		nbt.map.Tags.push(new nbtlint.TagString('new'))
		nbt.map.Tags.push(new nbtlint.TagString(tags.model))
		nbt.map.Tags.push(new nbtlint.TagString(tags.allBones))
		nbt.map.Tags.push(
			new nbtlint.TagString(
				format(tags.individualBone, { boneName: boneName })
			)
		)

		if (!nbt.map.Pose) {
			nbt.add(
				'Pose',
				new nbtlint.TagCompound({
					Head: new nbtlint.TagList(nbtlint.TagFloat, [
						new nbtlint.TagFloat(boneFrame.rot.x),
						new nbtlint.TagFloat(boneFrame.rot.y),
						new nbtlint.TagFloat(boneFrame.rot.z),
					]),
				})
			)
		} else if (!nbt.map.Pose.Head) {
			nbt.map.Pose.add(
				'Head',
				new nbtlint.TagList(nbtlint.TagFloat, [
					new nbtlint.TagFloat(boneFrame.rot.x),
					new nbtlint.TagFloat(boneFrame.rot.y),
					new nbtlint.TagFloat(boneFrame.rot.z),
				])
			)
		}

		if (!nbt.map.ArmorItems)
			nbt.add(
				'ArmorItems',
				new nbtlint.TagList(nbtlint.TagCompound, [
					new nbtlint.TagCompound({}),
					new nbtlint.TagCompound({}),
					new nbtlint.TagCompound({}),
					new nbtlint.TagCompound({
						id: new nbtlint.TagString(ajSettings.rigItem),
						Count: new nbtlint.TagByte(1),
						tag: new nbtlint.TagCompound({
							CustomModelData: new nbtlint.TagString(
								'%customModelData'
							),
						}),
					}),
				])
			)

		nbt.add(
			'Marker',
			new nbtlint.TagByte(
				Number(statueExporterSettings.markerArmorStands)
			)
		)
		nbt.add('NoGravity', new nbtlint.TagByte(1))
		nbt.add('Invisible', new nbtlint.TagByte(1))
		nbt.add('DisabledSlots', new nbtlint.TagInteger(4144959))

		console.log('nbt:', nbt)
		// prettier-ignore
		summons.push({
			boneName,
			nbt,
			customModelData: bone.customModelData,
			command: `summon armor_stand ^${boneFrame.pos.x} ^${boneFrame.pos.y + HEAD_Y_OFFSET} ^${boneFrame.pos.z}`,
		})
	}

	// `summon minecraft:area_effect_cloud ^ ^ ^ {Tags:['aj.example', 'aj.example.bone', 'aj.example.boneA', 'new'],Passengers:[{id:"minecraft:armor_stand",Tags:['aj.example', 'aj.example.bone_model', 'new']}],Age:-2147483648,Duration:-1,WaitTime:-2147483648}`
	// prettier-ignore
	// FILE.push(`
	// dir summon {
	// 	function default {
	// 		summon ${entityTypes.root} ~ ~ ~ {Tags:['${tags.model}', '${tags.root}', 'new']}
	// 		execute as @e[type=${entityTypes.root},tag=${tags.root},tag=new,distance=..1,limit=1] at @s rotated ~ 0 run {
	// 			execute store result score @s aj.id run scoreboard players add .aj.last_id aj.i 1

	// 			${summons.join('\n')}

	// 			execute as @e[type=${entityTypes.bone},tag=${tags.model},tag=new,distance=..${staticDistance}] positioned as @s run {
	// 				scoreboard players operation @s aj.id = .aj.last_id aj.i
	// 				tp @s ~ ~ ~ ~ ~
	// 				tag @s remove new
	// 			}
	// 			tag @s remove new
	// 		}
	// 	}
	// }
	// `)

	FILE.push(`dir summon {`)
	for (const [variantName, variant] of Object.entries(
		variantModels as Record<string, any>
	)) {
		const thisSummons = []
		for (const summon of summons) {
			if (Object.keys(variant).includes(summon.boneName)) {
				console.log('Included in variant')
				thisSummons.push({
					...summon,
					customModelData:
						variant[summon.boneName].aj.customModelData,
				})
			}
		}

		// prettier-ignore
		FILE.push(`
		function ${variantName} {
			summon ${entityTypes.root} ~ ~ ~ {Tags:['${tags.model}', '${tags.root}', 'new']}
			execute as @e[type=${entityTypes.root},tag=${tags.root},tag=new,distance=..1,limit=1] at @s rotated ~ 0 run {
				execute store result score @s aj.id run scoreboard players add .aj.last_id aj.i 1

				${summons.map(v => {
					return `${v.command} ${nbtlint.stringify(v.nbt, '', {deflate: true})}`.replace('"%customModelData"', v.customModelData)
				}).join('\n')}

				execute as @e[type=${entityTypes.bone},tag=${tags.model},tag=new,distance=..${staticDistance}] positioned as @s run {
					scoreboard players operation @s aj.id = .aj.last_id aj.i
					tp @s ~ ~ ~ ~ ~
					tag @s remove new
				}
				tag @s remove new
			}
		}
		`)
	}
	FILE.push('}')

	if (Object.keys(variantTouchedModels).length > 0) {
		const variantBoneModifier = `data modify entity @s[tag=${tags.individualBone}] ArmorItems[-1].tag.CustomModelData set value %customModelData`
		FILE.push(`dir set_variant {`)
		for (const [variantName, variant] of Object.entries(
			variantModels as Record<string, any>
		)) {
			const thisVariantTouchedModels = { ...variantTouchedModels, ...variant }
			const thisVariantCommands = Object.entries(
				thisVariantTouchedModels as Record<string, any>
			).map(([k, v]) =>
				format(variantBoneModifier, {
					customModelData: v.aj.customModelData,
					boneName: k,
				})
			)
			// prettier-ignore
			FILE.push(`
				function ${variantName} {
					execute (if entity @s[tag=${tags.root}] at @s) {
						scoreboard players operation .this aj.id = @s aj.id
						execute as @e[type=${entityTypes.boneDisplay},tag=${tags.allBones},distance=..${staticDistance}] if score @s aj.id = .this aj.id run {
							${thisVariantCommands.join('\n')}
						}
					} else {
						tellraw @s ${rootExeErrorJsonText.replace('%functionName',`${projectName}:set_variant/${variantName}`)}
					}
				}
			`)
		}
		FILE.push('}')
	}

	return fixIndent(FILE)
}

async function statueExport(data: any) {
	const mcFile = await createMCFile(
		data.bones,
		data.animations,
		data.settings.animatedJava,
		data.settings.animatedJava_exporter_statueExporter,
		data.variantModels,
		data.variantTextureOverrides,
		data.variantTouchedModels
	)

	if (!data.settings.animatedJava_exporter_statueExporter.mcbFilePath) {
		let d = new Dialog({
			title: translate(
				'animatedJava_exporter_statueExporter.popup.error.mcbFilePathNotDefined.title'
			),
			id: '',
			lines: translate(
				'animatedJava_exporter_statueExporter.popup.error.mcbFilePathNotDefined.body'
			)
				.split('\n')
				.map((line: string) => `<p>${line}</p>`),
			onConfirm() {
				d.hide()
			},
			onCancel() {
				d.hide()
			},
		}).show()
		throw new CustomError({ silent: true })
	}

	console.log('mcFile:', mcFile)
	Blockbench.writeFile(
		data.settings.animatedJava_exporter_statueExporter.mcbFilePath,
		{
			content: mcFile,
			custom_writer: null,
		}
	)

	Blockbench.showQuickMessage('Model Exported Successfully')
}

interface statueExporterSettings {
	modelTag: string
	rootTag: string
	allBonesTag: string
	individualBoneTag: string
	rootEntityType: string
	boneType: 'aecStack' | 'armorStand'
	internalScoreboardObjective: string
	idScoreboardObjective: string
	exportMode: 'datapack' | 'mcb'
	mcbFilePath: string | undefined
	dataPackFilePath: string | undefined
	markerArmorStands: boolean
}

const Exporter = (AJ: any) => {
	AJ.settings.registerPluginSettings('animatedJava_exporter_statueExporter', {
		rootEntityType: {
			type: 'text',
			default: 'minecraft:marker',
			populate() {
				return 'minecraft:marker'
			},
			isValid(value: any) {
				return value != ''
			},
			isResetable: true,
		},
		markerArmorStands: {
			type: 'checkbox',
			default: true,
			populate() {
				return true
			},
			isValid(value: any) {
				return typeof value === 'boolean'
			},
		},
		modelTag: {
			type: 'text',
			default: 'aj.%projectName',
			populate() {
				return 'aj.%projectName'
			},
			isValid(value: any) {
				return value != ''
			},
			isResetable: true,
		},
		rootTag: {
			type: 'text',
			default: 'aj.%projectName.root',
			populate() {
				return 'aj.%projectName.root'
			},
			isValid(value: any) {
				return value != ''
			},
			isResetable: true,
		},
		allBonesTag: {
			type: 'text',
			default: 'aj.%projectName.bone',
			populate() {
				return 'aj.%projectName.bone'
			},
			isValid(value: any) {
				return value != ''
			},
			isResetable: true,
		},
		individualBoneTag: {
			type: 'text',
			default: 'aj.%projectName.bone.%boneName',
			populate() {
				return 'aj.%projectName.bone.%boneName'
			},
			isValid(value: any) {
				return value != ''
			},
			isResetable: true,
		},
		internalScoreboardObjective: {
			type: 'text',
			default: 'aj.i',
			populate() {
				return 'aj.i'
			},
			isValid(value: any) {
				return value != ''
			},
		},
		idScoreboardObjective: {
			type: 'text',
			default: 'aj.id',
			populate() {
				return 'aj.id'
			},
			isValid(value: any) {
				return value != ''
			},
		},
		exportMode: {
			type: 'select',
			default: 'mcb',
			options: {
				vanilla:
					'animatedJava_exporter_statueExporter.setting.exportMode.vanilla.name',
				mcb: 'animatedJava_exporter_statueExporter.setting.exportMode.mcb.name',
			},
			populate() {
				return 'mcb'
			},
			isValid(value: any) {
				return value != ''
			},
		},
		mcbFilePath: {
			type: 'filepath',
			default: '',
			props: {
				dialogOpts: {
					defaultPath: Project.name + '.mc',
					promptToCreate: true,
					properties: ['openFile'],
				},
			},
			populate() {
				return ''
			},
			isValid(value: any) {
				return true
			},
			isVisible(settings: any) {
				return (
					settings.animatedJava_exporter_statueExporter.exportMode ===
					'mcb'
				)
			},
			dependencies: ['animatedJava_exporter_statueExporter.exportMode'],
		},
		dataPackPath: {
			type: 'filepath',
			default: '',
			props: {
				target: 'folder',
				dialogOpts: {
					promptToCreate: true,
					properties: ['openDirectory'],
				},
			},
			populate() {
				return ''
			},
			isValid(value: any) {
				return true
			},
			isVisible(settings: any) {
				return (
					settings.animatedJava_exporter_statueExporter.exportMode ===
					'vanilla'
				)
			},
			dependencies: ['animatedJava_exporter_statueExporter.exportMode'],
		},
	})
	AJ.registerExportFunc('statueExporter', function () {
		AJ.build(
			(data: any) => {
				console.log('Input Data:', data)
				statueExport(data)
			},
			{
				generate_static_animation: true,
			}
		)
	})
}
if (Reflect.has(window, 'ANIMATED_JAVA')) {
	Exporter(window['ANIMATED_JAVA'])
} else {
	// @ts-ignore
	Blockbench.on('animated-java-ready', Exporter)
}

// {
// 	icon: 'info',
// 	category: 'animated_java.statue_exporter',
// 	name: 'Statue Exporter',
// 	id: 'statue_exporter',
// 	// @ts-ignore
// 	condition: () => AJ.format.id === Format.id,
// 	click: function () {
// 		AJ.build(
// 			(data: any) => {
// 				console.log('Input Data:', data)
// 				statueExport(data)
// 			},
// 			{
// 				generate_static_animation: true,
// 			}
// 		)
// 	},
// }
