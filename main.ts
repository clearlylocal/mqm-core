import { parse } from 'jsr:@std/csv'
import { assert } from 'jsr:@std/assert'

const HEADER_ROW_IDX = 0

type Column = typeof columns[number]
const columns = [
	'errorTypeDisplayName',
	'errorTypeDescription',
	'errorTypeExamples',
	'errorTypeNotes',
	'errorTypeLevelNo',
	'alphanumericErrorTypePid',
	'mnemonicErrorTypeId',
	'errorTypeParent',
	'seeNoteNo',
] as const

function isContentful(x: Record<string, string>) {
	return Object.values(x).some((x) => x !== '')
}

function getRows(csv: string): Record<Column, string>[] {
	return parse(csv, { columns }).slice(HEADER_ROW_IDX + 1).filter(isContentful)
}

type Rows = typeof rows
const rows = getRows(await Deno.readTextFile('./mqm-core-2024-03-07.csv'))

type ErrorKind = {
	id: string
	pid: string | null
	name: string
	description: string
	examples: string | null
	notes: string | null
	level: number
}

function intWithAssertion(x: string) {
	assert(!/\D/.test(x))
	return parseInt(x)
}

function getData(rows: Rows) {
	const categories = new Map<string, ErrorKind[]>()

	for (const row of rows) {
		const k = row.errorTypeParent || row.mnemonicErrorTypeId
		const v = categories.get(k) ?? []
		v.push({
			id: row.mnemonicErrorTypeId.trim(),
			pid: row.alphanumericErrorTypePid.trim(),
			name: row.errorTypeDisplayName.trim(),
			description: row.errorTypeDescription.trim(),
			examples: row.errorTypeExamples.trim() || null,
			notes: row.errorTypeNotes.trim() || null,
			level: intWithAssertion(row.errorTypeLevelNo.trim()),
		})

		categories.set(k, v)
	}

	assert(!categories.has('custom'))
	assert(!categories.has('other'))

	categories.set('custom', [{
		id: 'custom',
		pid: null,
		name: 'Custom',
		description: 'Custom category for errors that don’t fit into the MQM typology',
		examples: null,
		notes: null,
		level: 0,
	}])

	return {
		topCats: Object.fromEntries([...categories]),
		// rows,
	}
}

await Deno.writeTextFile('./schema.json', JSON.stringify(getData(rows), null, '\t'))

// console.log(getData(rows))
