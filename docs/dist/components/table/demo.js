/**
 * Here we go.
 */
$.getJSON('assets/rowdata.json', function(json) {
	ts.ui.ready(function() {
		var input = generatedata(json).times(8);
		var title = input.length + ' Products';
		var table = ts.ui.get('#demotable');
		var toolb = ts.ui.get('#toolbar');

		table.maximize();
		table.selectable();
		table.configurable();
		table.cols(gettablecols());
		table.status('Status message goes here!');
		table.editable(ontableedit);
		toolb.title(title).buttons([
			{
				label: 'Build Incrementally',
				type: 'ts-secondary',
				onclick: function() {
					buildIncrementally(table, input);
					disablebuttons(toolb);
				}
			},
			{
				label: 'Build Everything',
				type: 'ts-secondary',
				onclick: function() {
					buildEverything(table, input);
					disablebuttons(toolb);
				}
			}
		]);
		function disablebuttons(toolbar) {
			toolbar.buttons([]); // DOH - disabled buttons not implemented on ToolBar :/
		}

		/*
		 * There's simply too much data in the table to sort things clientside.
		 * We should fix that by moving the sort to a Worker process somehow.
		 *
		table.sortable(function(index, ascending) {
			table.sort(index, ascending);
		});
		*/

		ts.ui.Notification.success('Note that this is really more of a test page than a demo.');
	});
});

// Table columns ...............................................................

/**
 * Building table cols (headers).
 * @returns {Array<object>}
 */
function gettablecols() {
	return [
		{
			label: 'Product ID',
			minwidth: 100
		},
		{
			label: 'Product Name',
			wrap: true,
			flex: 2,
			minwidth: 300,
			editable: true
		},
		{
			label: 'Price (USD)',
			type: 'ts-number',
			minwidth: 50,
			editable: true
		},
		{
			label: 'More Product ID',
			minwidth: 100
		},
		{
			label: 'Product Name Again',
			wrap: true,
			minwidth: 300,
			flex: 2
		},
		{
			label: 'Another Price',
			type: 'ts-number',
			minwidth: 50
		}
	];
}

// Build everything ............................................................

/**
 * Build the *entire* table on one huge hit.
 * Fortunately for us, that's the easy part.
 * @param {ts.ui.TableSpirit} table
 * @param {Array<Array<string|number|object>>} rows
 */
function buildEverything(table, rows) {
	table.rows(rows);
}

// Build incrementally .........................................................

/**
 * Build the table one page at a time.
 * @param {ts.ui.TableSpirit} table
 * @param {Array<Array<string|number|object>>} rows
 * @param {number} limit
 */
function buildIncrementally(table, rows) {
	// tracking max rows per page (the table will tell us how many it can fit)
	var maxrows = -1;

	// tracking first visible row in the page (so we can find it after resize)
	var first = -1;

	/*
	 * Assign selection callbacks so that we can synchronize selection
	 * between our data, all the rows, and the data that the table sees,
	 * a subset of the rows (basically add variable `first` to index).
	 */
	table.selectable(
		function onselect(selected, unselected) {
			selected.forEach(function(index) {
				rows[first + index].selected = true;
			});
			unselected.forEach(function(index) {
				rows[first + index].selected = false;
			});
		},
		function onselectall() {
			rows.forEach(function(row) {
				row.selected = true;
			});
		},
		function onunselectall() {
			rows.forEach(function(row) {
				row.selected = false;
			});
		}
	);

	/*
	 * Create custom pager to intercept selection (whenever the page changes).
	 */
	table.pager({
		onselect: updaterows
	});

	/**
	 * Maximize the table. The callback will informs us, how many
	 * (standard) rows the table will fit in the size it now has.
	 * When the window is resized, the callback will fire again.
	 */
	table.maximize(function(max) {
		maxrows = max;
		updatepager();
		updaterows();
	});

	/**
	 * Compute how the pager should look.
	 */
	function updatepager() {
		var pager = table.pager();
		var pages = rows.length / maxrows;
		pager.pages = Math.ceil(pages);
		if (first > 0) {
			pager.page = getpage(first);
		}
	}

	/**
	 * Update the "page" by assigning new rows to the table.
	 * @param {number} index
	 */
	function updaterows(index) {
		var start = maxrows * (index || 0);
		var stops = start + maxrows;
		var slice = rows.slice(start, stops);
		table.rows(objectify(slice));
		first = start;
	}

	/**
	 * Our data is in the "compact syntax" where the rows are declared as
	 * arrays, but we need the object syntax when we work with selection.
	 * @param {Array<Array>} rows
	 * @returns {Array<object>}
	 */
	function objectify(rowsToObjectify) {
		return rowsToObjectify.map(function makeobject(array) {
			return {
				selected: array.selected,
				cells: array
			};
		});
	}

	/**
	 * Get index of the page that shows the row at given index.
	 * This must be done whenever the table changes dimensions.
	 * @param {number} index
	 * @returns {number}
	 */
	function getpage(index) {
		var pagesize = maxrows;
		var page = 0,
			iter = 0;
		while ((iter += pagesize) <= index) {
			page++;
		}
		return page;
	}
}

// Table editing ...............................................................

/**
 * Simple input validation.
 * @param {number} ri Rowindex
 * @param {number} ci Cellindex
 * @param {string} value
 */
function ontableedit(ri, ci, value) {
	var table = ts.ui.get('#demotable');
	var column = table.cols()[ci];
	if (column.type.includes('ts-number')) {
		value = Number(value);
		if (isNaN(value)) {
			table.invalid(ri, ci, 'Please type a number');
		} else {
			table.cell(ri, ci, value);
		}
	} else {
		table.cell(ri, ci, value);
	}
}

// Generate dummy data .........................................................

/**
 * Dynamically generate even more testdata
 * by multiplying real data exponentially.
 * @param {Array<Array<string|number>>} rows
 * @returns {object}
 */
function generatedata(rows) {
	return {
		times: function(mult, debug) {
			var mults = 'x'.repeat(mult).split('');
			rows = rows.map(function(row) {
				// make more cells
				return row.concat(row); // .concat(rows).concat(rows);
			});
			mults.forEach(function() {
				// make more rows
				rows = rows.concat(rows);
			});
			// make all arrays unique and not duplicates
			// because stuff like `indexOf` would fail
			return rows
				.map(function(row, index) {
					return row.map(function(text) {
						return text + (debug ? ' (' + index + ')' : '');
					});
				})
				.sort(function random() {
					return Math.random() > 0.5;
				});
		}
	};
}
