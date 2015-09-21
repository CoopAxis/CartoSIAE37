/**
 * SiaeTree.js
 */

function SiaeTree(options)
{
	//var data_url = 'data/siae-mock.json' ;
	var data_url = 'data/Codes_ROME-tree.xls.json' ;
	var searchTimeout = 500 ;

	/**
	 * used in event context
	 */
	var self = this;

	this.treejs = $( '#'+options.treeId );

	this.treeSearch = $('#'+options.treeSearchId) ;

	// Construct the JSTree

	this.treejs.jstree({
		core: {
			multiple: true,
			data: {
				url: options.treeDataUrl,
				dataType : 'json'
			},
			error: function(e){
				alert('Erreur chargement des données (jsTree): '+"\n"+'('+e.id+') '+e.plugin+', '+e.error+': '+e.reason);
			}
		},
		plugins: [
		          "checkbox", "search",
		          // "state" plugin saves all opened and selected nodes in the user's browser,
		          // so when returning to the same tree the previous state will be restored.
		          "state"
		],
		checkbox: {
			three_state: true
		},
		search: {
			show_only_matches: true
		}
	});

	/**
	 * Handle Event: select a node 'select_node.jstree'
	 * - trigger the 'cartosiae.node_selected' event
	 */
	this.treejs.on('select_node.jstree', function(node, selected, event)
	{
		var sno = selected.node.original ;
		if( sno.rome )
		{
			// One selected leaf node
			$(self).trigger( 'cartosiae.node_selected', [sno] );
		}
		else
		{
			// A branche tree node, process its children
			var nodes = [];
			selected.node.children_d.forEach(function(n){
				n = self.treejs.jstree('get_node', n);
				if( n.original.rome )
					nodes.push( n.original );
			});
			$(self).trigger( 'cartosiae.node_selected', nodes );
		}
	});

	/**
	 * Handle Event: deselect a node 'deselect_node.jstree'
	 * - trigger the 'cartosiae.node_deselected' event
	 */
	this.treejs.on('deselect_node.jstree', function(node, deselected, event){
		var sno = deselected.node.original ;
		if( sno.rome )
			$(self).trigger( 'cartosiae.node_deselected', [sno] );
		else
		{
			var nodes = [];
			deselected.node.children_d.forEach(function(n){
				n = self.treejs.jstree('get_node', n);
				if( n.original.rome )
					nodes.push( n.original );
			});
			$(self).trigger( 'cartosiae.node_deselected', nodes );
		}
	});

	/**
	 * Handle button: select All
	 */
	$('#'+options.treeSelectAllId).on('click',function(e)
	{
		self.treejs.jstree(true).select_all();
		var nodes = self.treejs.jstree(true).get_selected();
		nodes.forEach(function(n){
			n = self.treejs.jstree(true).get_node(n);
			if( n.original.rome )
				$(self).trigger( 'cartosiae.node_selected', n.original );
		});
	});

	/**
	 * Handle button: select None
	 */
	$('#'+options.treeSelectNoneId).on('click',function(e)
	{
		//self.treeSearch.val('');
		//self.treejs.jstree(true).clear_search();
		self.treejs.jstree(true).deselect_all();
		$(self).trigger( 'cartosiae.all_nodes_selected' );

	});

	/**
	 * Handle button: clear search
	 */
	$('#'+options.treeSearchClear).on('click', function(e)
	{
		self.treeSearch.val('');
		self.treejs.jstree(true).clear_search();
	});

	/**
	 * Handle JSTree search
	 */
	var searchTimer = false;
	this.treeSearch.keyup(function()
	{
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(function() {
			var v = self.treeSearch.val();
			self.treejs.jstree(true).search(v);
		}, self.searchTimeout );
	});

}
