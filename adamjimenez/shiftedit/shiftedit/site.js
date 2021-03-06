define(['exports', "jquery-ui","app/prompt", "app/tree", "app/storage", "ui.combobox", "app/util", "app/ssl", "app/loading", 'app/prefs', 'aes', 'app/gdrive', 'app/editors'], function (exports) {
var prompt = require('app/prompt');
var tree = require('app/tree');
var storage = require('app/storage');
var lang = require('app/lang').lang;
var util = require('app/util');
var ssl = require('app/ssl');
var loading = require('app/loading');
var preferences = require('app/prefs');
var gdrive = require('app/gdrive');
var editors = require('app/editors');
var Aes = require('aes');
var directFn;
var sites = [];
var currentSite = storage.get('currentSite');
var combobox;
var site = {};
var definitions = {};

function setSiteValues(obj) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            var field = $('[name='+i+']');
            field.val(obj[i]);
        }
    }
}

window.shiftedit = {};
window.shiftedit.setSiteValues = setSiteValues;

function enableMenuItems(site) {
    var items = ['editsite', 'duplicate', 'deletesite', 'export', 'shareSite', 'downloadRevisions'];

    if(site.db_phpmyadmin)
        items.push('phpmyadmin');

    if(site.server_type==='Hosted') {
        items.push('reboot');
        items.push('logs');
    }

    if(site.logon_type == 'key')
        items.push('sshSite');

    items.forEach(function(item){
        $('#'+item).removeClass('ui-state-disabled');
    });
}

function disableMenuItems() {
    var items = ['editsite', 'duplicate', 'deletesite', 'export', 'shareSite', 'downloadRevisions', 'phpmyadmin', 'ssh', 'reboot', 'logs'];

    items.forEach(function(item){
        $('#'+item).removeClass('ui-state-disabled');
    });
}

function init() {
    $('body').on('click','.newTab .site', function(){
        create();
    });

    combobox = $( "#sites" ).combobox({
        forceSelection: true,
        selectOnFocus: true,
        selectFirst: true,
        select: function (event, ui) {
            //connect to site
            open(ui.item.value);
        },
        change: function (event, ui) {
            //connect to site
            open(ui.item.value);
        },
        create: function( event, ui ) {
            //load();
        }
    });

    $( "#refresh_site" ).button()
    .click(function() {
        if (currentSite) {
        	open(currentSite);
        }
    });

    //button menu
    var items = [{
        id: 'newsite',
        text: 'New site..',
        handler: create,
        disabled: false
    }, {
        id: 'editsite',
        text: 'Edit site..',
        handler: edit,
        disabled: true
    }, {
        id: 'duplicate',
        text: 'Duplicate..',
        handler: duplicate,
        disabled: true
    }, {
        id: 'deletesite',
        text: 'Delete site',
        handler: function(undef, e, confirmed) {
            if(!confirmed) {
                var me = this;
                prompt.confirm({
                    title: 'Delete site',
                    msg: 'Are you sure?',
                    fn: function(value) {
                       switch(value) {
                            case 'yes':
                                $(me).trigger('click', [true]);
                                return;
                            default:
                                return false;
                       }
                    }
                });
                return;
            }

            loading.fetch('/api/sites?cmd=delete&site='+currentSite, {
                action: 'Deleting site '+site.name,
                success: function(data) {
                    //remove this site from any active tabs
                    $("li[data-site='"+currentSite+"']").attr('data-site', '');

                    //disable file tree
                    $('#tree-container').hide();

                    //disable site options
                    disableMenuItems();

                    currentSite = 0;
                    storage.set('currentSite', currentSite);

                    //refresh combo
                    $( "#sites" ).combobox('val', '');
                    load();
                }
            });
        },
        disabled: true
    }, '-', {
        id: 'import',
        text: 'Import..',
        handler: function() {
            //import site dialog
            $( "body" ).append('<div id="dialog-import" title="Import site">\
              <form>\
                <fieldset>\
                    Import a Dreamweaver or Filezilla xml file.\
                    <input type="file" name="file" id="importSite" class="text ui-widget-content ui-corner-all">\
                </fieldset>\
              </form>\
            </div>');

            function doImport(content){
                $( "#dialog-import" ).dialog( "close" );
                $( "#dialog-import" ).remove();

                loading.fetch('/api/sites?cmd=import', {
                    action: 'Importing site',
            	    data: {
            	        content: content
            	    },
                    success: function(data) {
						prompt.alert({title: 'Success', msg: data.imported+' site(s) imported.'});
						currentSite = data.site;
						load();
                    }
                });
            }

            $('#importSite').change(function(e){
                var files = e.target.files; // FileList object

        		if (files.length === 0) {
        			return;
        		}

        		var file = files[0];
    			var reader = new FileReader();
    			reader.onloadend = function (file) {
    				return function () {
    					doImport(reader.result);
    				};
    			}(file);

                reader.readAsText(file);
            });

            //open dialog
            var dialog = $( "#dialog-import" ).dialog({
                modal: true,
                width: 400,
                height: 300
            });
        },
        disabled: false
    }, {
        id: 'export',
        text: 'Export',
        handler: function() {
            loading.fetch('/api/sites?cmd=export&site='+currentSite, {
                action: 'Exporting site',
                success: function(data) {
                    var link = $('<a href="data:text/xml;base64,'+btoa(data.content)+'" download="'+data.file+'"></a>').appendTo('body');
                    link.get(0).click();
                    link.remove();
                }
            });
        },
        disabled: true
    }, {
        id: 'shareSite',
        text: 'Share site',
        handler: function() {
            //import site dialog
            $( "body" ).append('<div id="dialog-share-site" title="Share site">\
              <form id="shareSiteForm">\
            	<div class="hbox">\
                    <label for="share_email">Email</label>\
                    <input id="share_email" type="text" name="email" class="flex text ui-widget-content ui-corner-all" required autofocus>\
                    <button type="submit">Add</button>\
                </div>\
                <div id="users">\
                </div>\
              </form>\
            </div>');

			$('#shareSiteForm button').button();

            loadUsers();

            //handle add user
            $('#shareSiteForm').submit(function(event){
                event.preventDefault();

                loading.fetch('/api/share?cmd=save&site=' + currentSite + '&email=' + $('#shareSiteForm input[name=email]').val(), {
                    action: 'saving user',
                    success: function(data) {
                        $('#shareSiteForm input[name=email]').val('');
    					loadUsers();
                    }
                });
            });

            //handle remove user
            $('#shareSiteForm').on('click', 'a.delete', function() {
                loading.fetch('/api/share?cmd=delete&site='+currentSite+'&contact='+$(this).data('id'), {
                    action: 'deleting user',
                    success: function(data) {
    					loadUsers();
                    }
                });
            });

            //open dialog
            var dialog = $( "#dialog-share-site" ).dialog({
                modal: true,
                width: 400,
                height: 300,
	            close: function( event, ui ) {
	                $( this ).remove();
	            }
            });
        },
        disabled: true
    }, {
        id: 'downloadRevisions',
        text: 'Download revisions',
        handler: function() {
	        window.open('_ajax/download_revisions.php?site='+currentSite);
        },
        disabled: true
    }, '-', {
        id: 'phpmyadmin',
        text: 'PhpMyAdmin',
        handler: function() {
            var prefs = preferences.get_prefs();
    		var settings = getSettings(currentSite);
    		var password = settings.db_password;

    		if (prefs.useMasterPassword && password) {
    			password = Aes.Ctr.decrypt(password, storage.get('masterPassword'), 256);
    		}

    		// create hidden form
    		var form = $('<form id="pma_form" method="post" target="_blank" action="'+settings.db_phpmyadmin+'">\
    		<input type="hidden" name="pma_username" value="'+settings.db_username+'">\
    		<input type="hidden" name="pma_password" value="'+password+'">\
    		</form>').appendTo('body')
    		.on('submit', function(){
    		    $(this).remove();
    		})
    		.submit();
        },
        disabled: true
    }, '-', {
        id: 'sshSite',
        text: 'SSH Terminal',
        handler: function() {},
        disabled: true
    }, {
        id: 'reboot',
        text: 'Reboot',
        handler: function() {
            loading.fetch('/api/sites?cmd=reboot&site='+currentSite, {
                action: 'Rebooting site '+site.name,
                success: function(data) {
                }
            });
        },
        disabled: true
    }, {
        id: 'logs',
        text: 'Server logs',
        handler: function() {
            loading.fetch('/api/sites?cmd=logs&site='+currentSite, {
                action: 'Fetching logs '+site.name,
                success: function(data) {
					editors.create("server.log", data.content);
                }
            });
        },
        disabled: true
    }];

    var el = $("#siteMenu");
    var context;
    items.forEach(function(item) {
        if(item==='-') {
            el.append('<li>-</li>');
        } else {
            var itemEl = $('<li id="'+item.id+'">\
                <a href="#">'+item.text+'</a>\
            </li>').appendTo(el);

            if(item.disabled) {
                itemEl.addClass('ui-state-disabled');
            }

            if(item.handler) {
                itemEl.click(jQuery.proxy(item.handler, undefined, context));
            }
        }
    });

    var menu = $("#siteMenu").menu().hide();

    $("#siteNenuBtn").button()
    .click(function() {
        // Make use of the general purpose show and position operations
        // open and place the menu where we want.
        menu.show().position({
              my: "left top",
              at: "left bottom",
              of: this
        });

        // Register a click outside the menu to close it
        $( document ).on( "click", function() {
              menu.hide();
        });

        // Make sure to return false here or the click registration
        // above gets invoked.
        return false;
    });
}

function open(siteId, options) {
    if(!options) {
        options = {};
    }

    currentSite = null;

    if(!siteId) {
    	storage.set('currentSite', currentSite);
    	return;
    }

    //hide tree
    $('#tree-container').hide();

    site = getSettings(siteId);
    currentSite = siteId;
    storage.set('currentSite', currentSite);
    enableMenuItems(site);
    $( "#sites" ).combobox('val', currentSite+'');

    var ajax;
	if (!loading.start('Connecting to site '+site.name, function(){
		console.log('abort opening site');
		ajax.abort();
		opening = {};
	})) {
		console.log('in queue');
		return;
	}

	function openCallback() {
    	$('#tree-container').show();

        //highlight active tabs
        var color = util.strToHex(siteId);
        $('#siteStyle-'+siteId).remove();
        $('<style id="siteStyle-'+siteId+'">.site-' + siteId + '{background:' + color + ';}</style>').appendTo('head');

        if(options.callback) {
            options.callback();
        }
	}

    if(site.server_type == 'AJAX' || site.turbo == 1){
        var ajaxOptions = getAjaxOptions();
		console.log("connecting to: "+ajaxOptions.url);
        tree.setAjaxOptions(ajaxOptions);
		loading.stop();
		openCallback();
		return;
	//} else if(settings.server_type == 'GDriveJS'){
	} else if(['GDrive','GDriveLimited'].indexOf(site.server_type)!=-1) {
        gdrive.setFullAccess(site.server_type === 'GDrive');
        $('#tree').data('dir', site.dir);
        $('#tree').data('dir_id', site.dir_id);

		gdrive.authorise(function(){
		    loading.stop();
		    $('#tree-container').show();
            tree.setAjaxOptions(gdrive.directFn);
            directFn = gdrive.directFn;
		});
        return;
    }

    directFn = null;
    ajax = $.ajax({
        url: '/api/sites?site='+siteId,
	    method: 'POST',
	    dataType: 'json',
	    data: {
	        password: options.password,
	        masterPassword: options.masterPassword,
	        save_password: 1
	    }
    });
    
    ajax.then(function (data) {
        loading.stop();
        //console.log(data);

        if(data.success){
       		definitions[siteId] = data.definitions;

            //load file tree
            var ajaxOptions = getAjaxOptions('/api/files?site='+siteId);
            tree.setAjaxOptions(ajaxOptions);
			openCallback();
        }else{
            if (data.require_password) {
        		password = site.ftp_pass;

				var prefs = preferences.get_prefs();
        		if (prefs.useMasterPassword) {
        			if (password) {
        				password = (Aes.Ctr.decrypt(password, storage.get('masterPassword'), 256));
        			}
        		}

    			prompt.prompt({
    			    title: 'Require server password for '+site.name,
    			    msg: lang.passwordText,
    			    value: password,
    			    password: true,
    			    fn: function(btn, password) {
    			        switch(btn) {
    			            case 'ok':
    			                options.password = password;

    							var prefs = preferences.get_prefs();
    							if (prefs.useMasterPassword) {
    								if (password) {
    									options.password = Aes.Ctr.encrypt(password, storage.get('masterPassword'), 256);
    								}
    							}

    							open(siteId, options);
			                break;
    			        }
    			    }
    			});
            }else if (data.require_master_password) {
    			masterPasswordPrompt(function() {
					options.masterPassword = storage.get('masterPassword');
					open(siteId, options);
    			});
            }else{
                prompt.alert({title:'Error', msg:data.error});
            }
        }
    }).fail(function() {
        loading.stop();
		prompt.alert({title:lang.failedText, msg:'Error opening site'});
    });

    return ajax;
}

function masterPasswordPrompt(callback) {
	prompt.prompt({
	    title: lang.requireMasterPasswordText,
	    msg: lang.passwordText,
	    password: true,
	    fn: function(btn, password) {
	        switch(btn) {
	            case 'ok':
					storage.set('masterPassword', preferences.createHash(password));
					callback();
                break;
	        }
	    }
	});
}

function loadUsers() {
    loading.fetch('/api/share?cmd=list&site='+currentSite, {
        action: 'getting users',
        success: function(data) {
			var html = '';

			data.shared.forEach(function(item){
			    html = '<p>' + item.name + ' <a href="#" data-id="'+item.id+'" class="delete">X</a></p>';
			});

			$('#users').html(html);

			$('#shareSiteForm input[name=email]').focus();
        }
    });
}

function loadRepos(val) {
    return $.getJSON('/api/repos')
        .then(function (data) {
            var repos = data.repos;

            $( "#git_url_select" ).children('option').remove();

            $.each(repos, function( index, item ) {
                $( "#git_url_select" ).append( '<option value="'+item.url+'">'+item.name+'</option>' );
            });

            if(val) {
                $( "#git_url_select" ).append( '<option value="'+val+'">'+val+'</option>' );
                $( "#git_url_select" ).val(val).change();
            }

            return repos;
        });
}

function load() {
    return $.getJSON('/api/sites')
        .then(function (data) {
            sites = data.sites;
            $( "#sites" ).children('option').remove();

            if (!sites || !sites.length) {
            	currentSite = 0;
            	create();
            	return;
            }

            $.each(sites, function( index, site ) {
                var icon = '';
                if (site.shared) {
                    //shared = '<i class="fa fa-share-alt" style="position: absolute; right: 0; top: 25%;"></i>';
                    icon = 'fa fa-share-alt';
                }

                $( "#sites" ).append( '<option data-icon="'+icon+'" value="'+site.id+'">' + site.name + '</option>' );
            });

            if(currentSite) {
                return open(currentSite);
            }

            return sites;
        });
}

function create() {
    edit(true);
}

function duplicate() {
    edit(false, true);
}

function updateCategory() {
    var category = $('input[name=server_type]').val();

    fields = [
        'hosted_container',
        'cloud_container',
        'host_container',
        'proxyfield',
        'domainContainer',
        'portContainer',
        'timeoutContainer',
        'authentication_container',
        'ftp_user',
        'pass_container',
        'ssh_key_container',
        'dir_container',
        'web_url',
        'turbo_mode_container',
        'git_url',
        's3_public',
        's3info',
        'gdrivelimited',
        'testSiteButton'
    ];

    categories = {
        'FTP': [
            'host_container',
            'portContainer',
            'timeoutContainer',
            'ftp_user',
            'pass_container',
            'dir_container',
            'web_url',
            'turbo_mode_container',
            'testSiteButton'
        ],
        'SFTP': [
            'host_container',
            'portContainer',
            'timeoutContainer',
            'authentication_container',
            'ftp_user',
            'pass_container',
            'dir_container',
            'web_url',
            'turbo_mode_container',
            'testSiteButton'
        ],
        'Cloud': [
            'cloud_container',
        ],
        'AmazonS3': [
            'cloud_container',
            's3_public',
            's3info',
            'ftp_user',
            'pass_container',
            'dir_container',
            'web_url',
            'testSiteButton'
        ],
        'Dropbox': [
            'cloud_container',
            'dir_container',
			'web_url',
            'testSiteButton'
        ],
        'GDrive': [
            'cloud_container',
            'gdrivelimited',
            'dir_container',
			'web_url',
            'testSiteButton'
        ],
        'GDriveLimited': [
            'cloud_container',
            'gdrivelimited',
            'dir_container',
			'web_url',
            'testSiteButton'
        ],
        'Hosted': [
            'git_url',
            'hosted_container'
        ],
        'AJAX': [
            'proxyfield',
            'host_container',
            'ftp_user',
            'pass_container',
            'dir_container',
            'web_url',
            'testSiteButton'
        ],
        'WebDAV': [
            'host_container',
            'ftp_user',
            'pass_container',
            'dir_container',
            'web_url',
            'testSiteButton'
        ]
    };

    fields.forEach(function(field){
        $('#'+field).hide();
    });

    if (categories[category]) {
        categories[category].forEach(function(field){
            $('#'+field).show();
        });

        if( ['GDrive', 'GDriveLimited', 'Dropbox', 'AmazonS3'].indexOf(category) !== -1 ){
            $('[name=serverTypeItem][value=Cloud]:first').attr("checked", "checked").button('refresh');

            if( ['GDrive', 'GDriveLimited'].indexOf(category) !== -1 ){
                $('[name=cloud][value=GDrive]:first').attr("checked", "checked").button('refresh');
            } else {
                $('[name=cloud][value=' + category + ']:first').attr("checked", "checked").button('refresh');
            }
        } else if( ['AJAX', 'WebDAV'].indexOf(category) !== -1 ) {
            $('[name=serverTypeItem][value=Other]:first').attr("checked", "checked").button('refresh');
        } else {
            $('[name=serverTypeItem][value=' + category + ']:first').attr("checked", "checked").button('refresh');
        }
    }

    //domain placeholder
    var domain_placeholder = 'e.g. ftp.mydomain.com';
    if( category==='AJAX' ){
        domain_placeholder = 'e.g. www.mydomain.com/shiftedit-proxy.php';
    } else if( category==='SFTP' ){
        domain_placeholder = 'e.g. mydomain.com';
    } else if( category==='WebDAV' ){
        domain_placeholder = 'e.g. www.mydomain.com';
    }

    $('#domain').attr('placeholder', domain_placeholder);

    //username placeholder
    var username_placeholder = 'your username';
    if( category==='AmazonS3' ){
        username_placeholder = 'access key id';
    }

    $('#ftp_user').attr('placeholder', username_placeholder);

    //password placeholder
    var password_placeholder = '';
    if( category==='AmazonS3' ){
        password_placeholder = 'secret access key';
    }

    $('#ftp_pass').attr('placeholder', password_placeholder);
}

function chooseFolder() {
    var prefs = preferences.get_prefs();
    var ajaxOptions = getAjaxOptions('/api/files?site=');
    var params = $.extend({}, ajaxOptions.params, util.serializeObject($('#siteSettings')));

	if (prefs.useMasterPassword) {
		if (params.ftp_pass) {
			params.ftp_pass = Aes.Ctr.encrypt(params.ftp_pass, storage.get('masterPassword'), 256);
		}
		if (params.db_password) {
			params.db_password = Aes.Ctr.encrypt(params.db_password, storage.get('masterPassword'), 256);
		}
	}

	delete params.dir;
	delete params.dir_id;

    $( "body" ).append('<div id="dialog-choose-folder" title="Choose folder">\
<div id="folderTree"></div>\
</div>');

    var folderTree = $('#folderTree').jstree({
    	'core' : {
            'data' : function (node, callback) {
                if( ['GDrive', 'GDriveLimited'].indexOf(params.server_type) !== -1 ){
                    gdrive.directFn({node: node, callback: callback, tree: $('#folderTree')});
                }else{
                    if(!ajaxOptions.url){
                        return false;
                    }

		            if(node.id==='#') {
		            	return callback.call($('#folderTree'), {
		            		children: true,
		            		id: '#root',
		            		text: ajaxOptions.dir,
		            		type: 'folder'
		            	});
		            }

					//backcompat old turbo mode
					params.path = '';
					if(node.id!=='#root')
						params.path = encodeURIComponent(node.id);

            		$.ajax(ajaxOptions.url+'&cmd=get&path='+params.path, {
            		    method: 'POST',
            		    dataType: 'json',
            		    data: params,
            		    success: function(data) {
            		    	if(data.error) {
            		    		prompt.alert({title:'Error', msg:data.error});
            		    		return;
            		    	}

            		    	//backcompat old turbo mode
            		    	if(!data)
            		    		return;

            		    	if(!data.files) {
            		    		var files = [];
            		    		data.forEach(function(item){
            		    			files.push({
            		    				children: (!item.leaf),
            		    				data: {
            		    					perms: item.perms,
            		    					modified: item.modified,
            		    					size: item.size
            		    				},
            		    				icon: (item.leaf ? 'file' : 'folder'),
            		    				id: item.id,
            		    				text: item.text,
            		    				type: (item.leaf ? 'file' : 'folder')
            		    			});
            		    		});
            		    		data.files = files;
            		    	}

                            callback.call(tree, data.files);
            		    }
            		});
                }
            },
    		'themes': {
    			'responsive': false,
    			'variant': 'small',
    			'stripes': true
    		}
    	},
    	'types' : {
    		'default' : { 'icon' : 'folder' },
    		'file' : { 'valid_children' : [], 'icon' : 'file' }
    	},
    	'sort' : function(a, b) {
    		return this.get_type(a) === this.get_type(b) ? (this.get_text(a).toLowerCase() > this.get_text(b).toLowerCase() ? 1 : -1) : (this.get_type(a) >= this.get_type(b) ? 1 : -1);
    	},
    	'plugins' : [
    	    'sort','types'
    	]
    }).on('loaded.jstree', function(e, data) {
    	//expand root node
		var inst = $.jstree.reference($('#folderTree'));
    	var rootNode = $('#folderTree').jstree(true).get_node('#').children[0];
    	inst.open_node(rootNode);
    });

    $( "#dialog-choose-folder" ).dialog({
        modal: true,
        minHeight: 200,
        maxHeight: 360,
        buttons: {
            OK: function() {
                var reference = folderTree;
                var instance = $.jstree.reference(folderTree);
                var selected = instance.get_selected();
                var node = instance.get_node(selected);

				if(node){
					var parent;
					if (node.children===false) {
						parent = node.parent;
					} else {
						parent = node;
					}

					var dir = node.id;
					if(dir.substr(0,1)==='#') {
						dir = node.text;
					}

					var dir_id = dir;

					//set web url for gdrive (https://googledrive.com/host/0B716ywBKT84AMXBENXlnYmJISlE/GoogleDriveHosting.html)
					if( params.server_type == 'GDrive' || params.server_type == 'GDriveLimited' ){
						$('input[name=web_url]').val('https://googledrive.com/host/'+node.id+'/');
						dir = node.text;
					}

					setSiteValues({
					    dir: dir,
					    dir_id: dir_id
					});
				}

                $( this ).dialog( "close" );
            },
            Cancel: function() {
                $( this ).dialog( "close" );
            }
        },
        close: function( event, ui ) {
            $( this ).remove();
        }
    });

	if(params.server_type == 'GDrive' || params.server_type == 'GDriveLimited'){
        gdrive.fullAccess = (params.server_type === 'GDrive');
    	gdrive.authorise(function(){
    	    folderTree.jstree(true).refresh();
    	});
	}
}

function test() {
    var server_type = $('#siteSettings [name=server_type]').val();

    if( ['Dropbox', 'GDrive', 'GDriveLimited'].indexOf(server_type) !== -1 ){
        if(server_type==='Dropbox'){
            return window.open('/popups/dropbox');
        }else{
            return window.open('/popups/google_drive?server_type='+server_type);
        }
    }

    var ajaxOptions = getAjaxOptions('/api/sites?site=');
    var params = $.extend({}, ajaxOptions.params, util.serializeObject($('#siteSettings')));
    var prefs = preferences.get_prefs();

	if (prefs.useMasterPassword) {
		if (!storage.get('masterPassword')) {
			return masterPasswordPrompt(test);
		}

		params.masterPassword = storage.get('masterPassword');

		if (params.ftp_pass) {
			params.ftp_pass = Aes.Ctr.encrypt(params.ftp_pass, storage.get('masterPassword'), 256);
		}
		if (params.db_password) {
			params.db_password = Aes.Ctr.encrypt(params.db_password, storage.get('masterPassword'), 256);
		}
	}

    var ajax;
	if (!loading.start('Testing site ' + params.name, function(){
		console.log('abort testing site');
		ajax.abort();
	})) {
		return;
	}

    ajax = $.ajax({
        url: ajaxOptions.url+'&cmd=test',
	    method: 'POST',
	    dataType: 'json',
	    data: params
    });
    
    ajax.then(function (data) {
        loading.stop();

        if(data.success) {
        	if(data.private){
				prompt.prompt({
					title: 'Folder permissions',
					msg: 'Make folder public readable?',
					fn: function (btn) {
						if (btn == "yes") {
						    $('#siteSettings [name=share]').val('1');
							test();
						}
					}
				});
			}else{
				//remember preview node for tidy up
				if( data.preview_node ){
					params.preview_node = data.preview_node;
				}

				//check web url
				if( params.web_url && params.server_type !== 'AJAX' ){
                	if (!loading.start('Testing site '+site.name, function(){
						clearTimeout(errorTimeout);
						$('#test_iframe').remove();
                	})) {
                		return;
                	}

					//appending slash
					if( params.web_url.substr(-1)!=='/' ){
						params.web_url += '/';
					}

					//create iframe
					$('body').append('<iframe id="test_iframe" src="' + params.web_url + '_shiftedit_test_preview.html?shiftedit=' + new Date().getTime() + '"></iframe>');

					//give up after 10 seconds
					errorTimeout = setTimeout(function(){
					    loading.stop();

						$('#test_iframe').remove();

						var hints = '';

						if( params.web_url.substr(0, 7) == 'http://' ){
							hints+= '<li>* Click the padlock in your browser address bar</li>';
						}

						if( params.web_url.substr(0, 7) !== 'http://' && params.web_url.substr(0, 8) !== 'https://' ){
							hints+= '<li>* Web url should begin with http:// or https://</li>';
						}

						hints += '<li>* Ensure Dir points to web root e.g. /httpdocs/</li>';

						prompt.alert({title: 'Error', msg: "Couldn't access web url:<ul>"+hints+'</ul>'});
					}, 5000);

					//listen for postmessage
					$(window).one('message', function(event) {
				        loading.stop();

						clearTimeout(errorTimeout);
						$('#test_iframe').remove();

						if( event.originalEvent.data == 'preview' ){
							prompt.alert({title: 'Success', msg: lang.connectionEstablishedText});
						}
					});
				}else{
					prompt.alert({title: 'Success', msg: lang.connectionEstablishedText});
				}
			}
        } else {
        	if (data.require_master_password) {
				return masterPasswordPrompt(test);
			} else {
            	prompt.alert({title:'Error', msg:data.error});
			}
        }
    }).fail(function() {
        loading.stop();
		prompt.alert({title:lang.failedText, msg:'Error testing site'});
    });
}

function save() {
    var params = util.serializeObject($('#siteSettings'));

    var ajax;
	if (!loading.start('Saving site ' + params.name, function(){
		console.log('abort saving site');
		ajax.abort();
	})) {
		return;
	}

    var prefs = preferences.get_prefs();
	if (prefs.useMasterPassword) {
		if (!storage.get('masterPassword')) {
			loading.stop();
			return masterPasswordPrompt(save);
		}

		params.masterPassword = storage.get('masterPassword');

		if (params.ftp_pass) {
			params.ftp_pass = Aes.Ctr.encrypt(params.ftp_pass, storage.get('masterPassword'), 256);
		}
		if (params.db_password) {
			params.db_password = Aes.Ctr.encrypt(params.db_password, storage.get('masterPassword'), 256);
		}
	}

    ajax = $.ajax({
        url: '/api/sites?cmd=save&site='+$('#siteSettings [name=id]').val(),
	    method: 'POST',
	    dataType: 'json',
	    data: params
    });
    
    ajax.then(function (data) {
        loading.stop();

        if(data.success){
			/*
			//set gdrive folder to public
			if(
			    (
			        server_type === 'GDrive' ||
			        server_type === 'GDriveLimited'
			    ) &&
			    dir_id
			){
			    console.log('set permissions');
			    gdrive.set_public(dir_id, true);
			}
			*/

			currentSite = data.site;
			load();

			$( "#dialog-site" ).dialog( "close" );
            $( "#dialog-site" ).remove();
        }else{
        	var error = 'unknown';
        	if (data.error) {
        		error = data.error.replace(/\n/g, "<br>");
        	}
            prompt.alert({title:'Error', msg: error});
        }
    }).fail(function() {
        loading.stop();
		prompt.alert({title:lang.failedText, msg:'Error saving site'});
    });
}

function edit(newSite, duplicate) {
	/*
	if (newSite && storage.get('premier') == 'false' && storage.get('edition') == 'Standard' && sites.length >= (1+1)) {
		return prompt.alert({title: 'Quota exceeded', msg:'Free edition is limited to 1 site. <a href="/premier" target="_blank">Go Premier</a>'});
	} else if (newSite && storage.get('premier') == 'false' && storage.get('edition') == 'Education' && sites.length >= (5+1)) {
		return prompt.alert({title: 'Quota exceeded', msg:'Education edition is limited to 5 sites. <a href="/premier" target="_blank">Go Premier</a>'});
	}
	*/

    var prefs = preferences.get_prefs();

	//create dialog BEWARE UGLY LONG STRING!
    $( "body" ).append('<div id="dialog-site" title="Site settings">\
      <form id="siteSettings" autocomplete="off">\
        <input type="hidden" name="server_type" value="">\
        <input type="hidden" name="id" value="">\
        <input type="hidden" name="share" value="">\
        <div id="siteTabs">\
        	<ul>\
        	    <li><a href="#tabs-site">Site</a></li>\
        	    <li><a href="#tabs-database">Database</a></li>\
        	    <li><a href="#tabs-advanced">Advanced</a></li>\
        	</ul>\
            <div>\
                <div id="tabs-site">\
                    <p>\
                        <label for="name">Name:</label>\
                        <input type="text" name="name" value="" class="text ui-widget-content ui-corner-all" required>\
                    </p>\
                    <p>\
                        <label for="name">Server type:</label>\
                        <span id="serverTypeRadio">\
                            <input type="radio" name="serverTypeItem" value="FTP" id="radio1" checked><label for="radio1">FTP</label>\
                            <input type="radio" name="serverTypeItem" value="SFTP" id="radio2"><label for="radio2">SFTP</label>\
                            <input type="radio" name="serverTypeItem" value="Cloud" id="radio3"><label for="radio3">Cloud Services</label>\
                            <input type="radio" name="serverTypeItem" value="Hosted" id="radio4"><label for="radio4">Hosted</label>\
                            <input type="radio" name="serverTypeItem" value="Other" id="other"><label for="other" id="otherLabel">Other</label>\
                            <ul id="otherMenu">\
                                <li><a href="#">AJAX</a></li>\
                                <li><a href="#">WebDAV</a></li>\
                            </ul>\
                        </span>\
                    </p>\
                    \
                    <div id="hosted_container">\
                        <p>\
                            <label for="name">Stack:</label>\
                            <span id="stackRadio">\
                                <input type="radio" name="stack" value="php" id="stackRadio1">\
                                <label for="stackRadio1" checled>\
                                    <img src="https://shiftedit.s3.amazonaws.com/images/logos/php.svg" height="32" width="32"><br>\
                                    PHP\
                                </label>\
                                <input type="radio" name="stack" value="nodejs" id="stackRadio2">\
                                <label for="stackRadio2">\
                                    <img src="https://shiftedit.s3.amazonaws.com/images/logos/nodejs.svg" height="32" width="32"><br>\
                                    Node.js\
                                </label>\
                            </span>\
                        </p>\
                        <p>\
                            <label for="name">Git URL:</label>\
                            <input type="hidden" id="git_url" name="git_url">\
                            <select id="git_url_select" name="git_url_select" class="text ui-widget-content ui-corner-all" required></select>\
                        </p>\
                    </div>\
                    \
                    <div id="cloud_container">\
                        <p>\
                            <label for="name">Cloud services:</label>\
                            <span id="cloudRadio">\
                                <input type="radio" name="cloud" value="Dropbox" id="cloudRadio1">\
                                <label for="cloudRadio1">\
                                    <img src="https://shiftedit.s3.amazonaws.com/images/logos/dropbox.svg" height="32" width="32"><br>\
                                    Dropbox\
                                </label>\
                                <input type="radio" name="cloud" value="GDrive" id="cloudRadio2">\
                                <label for="cloudRadio2">\
                                    <img src="https://shiftedit.s3.amazonaws.com/images/logos/googledrive.svg" height="32" width="32"><br>\
                                    Google Drive\
                                </label>\
                                <input type="radio" name="cloud" value="AmazonS3" id="cloudRadio3">\
                                <label for="cloudRadio3">\
                                    <img src="https://shiftedit.s3.amazonaws.com/images/logos/amazons3.svg" height="32" width="32"><br>\
                                    Amazon S3\
                                </label>\
                            </span>\
                        </p>\
                    </div>\
                    \
                    <label id="proxyfield">Use a PHP proxy file to handle connections. You will need to configure and upload the \
                    <a href="https://raw.githubusercontent.com/adamjimenez/shiftedit-ajax/master/shiftedit-proxy.php" target="_blank">proxy file</a>\
                    to your webspace.</label>\
                    \
                    <div id="host_container">\
                        <p>\
                            <label for="name">Host:</label>\
                            <input type="text" id="domain" name="domain" value="" class="text ui-widget-content ui-corner-all" required>\
                            <span id="portContainer">\
                                <label for="name">Port:</label>\
                                <input type="number" name="port" value="" class="text ui-widget-content ui-corner-all">\
                            </span>\
                            <span id="timeoutContainer">\
                                <label for="name">Timeout:</label>\
                                <input type="number" name="timeout" value="" class="text ui-widget-content ui-corner-all" required>\
                            </span>\
                        </p>\
                    </div>\
                    <p id="authentication_container">\
                        <label for="name">Authentication:</label>\
                        <span id="authenticationRadio">\
                            <input type="radio" name="logon_type" value="" id="logon_password" checked><label for="logon_password">Password</label>\
                            <input type="radio" name="logon_type" value="key" id="logon_key"><label for="logon_key">Public Key</label>\
                        </span>\
                    </p>\
                    <p id="ftp_user">\
                        <label for="name">Username:</label>\
                        <input type="text" id="ftp_user" name="ftp_user" value="" class="text ui-widget-content ui-corner-all" required>\
                    </p>\
                    <p id="pass_container">\
                        <label for="name">Password:</label>\
                        <input type="password" id="ftp_pass" name="ftp_pass" value="" class="text ui-widget-content ui-corner-all" required disabled>\
                        <button type="button" id="showPassword">Show</button>\
                    </p>\
                    <p id="ssh_key_container">\
                        <label for="name">Your SSH key:</label>\
                        <textarea id="sshKey" rows="4" readonly>'+storage.get('public_key')+'</textarea>\
                        <label>Save the SSH key in your: ~/.ssh/authorized_keys</label>\
                    </p>\
                    <p id="dir_container">\
                        <label for="name">Path:</label>\
                        <input type="hidden" name="dir_id" value="">\
                        <input type="text" name="dir" value="" class="text ui-widget-content ui-corner-all">\
                        <button type="button" id="chooseFolder">Choose</button>\
                    </p>\
                    <p id="web_url">\
                        <label for="name">Website URL:</label>\
                        <input type="text" name="web_url" value="" class="text ui-widget-content ui-corner-all">\
                    </p>\
                    <p id="turbo_mode_container">\
                        <label for="name">Turbo mode:</label>\
                        <label>\
                        <input type="checkbox" name="turbo" value="1" class="text ui-widget-content ui-corner-all" >\
                        Uploads a PHP proxy file for faster connections.\
                        </label>\
                    </p>\
                    <p id="gdrivelimited">\
                        <label for="name">Limited access:</label>\
                        <input type="checkbox" name="gdrivelimited" value="1" class="text ui-widget-content ui-corner-all" >\
                        Limit access to only files created in ShiftEdit.\
                    </p>\
                    <p id="s3_public">\
                        <label for="name">Save files with public access:</label>\
                        <input type="checkbox" name="s3_public" value="1" class="text ui-widget-content ui-corner-all" >\
                    </p>\
                </div>\
                <div id="tabs-database">\
                    <p>\
                        <label for="name">PhpMyAdmin Url:</label>\
                        <input type="text" name="db_phpmyadmin" value="" class="text ui-widget-content ui-corner-all">\
                    </p>\
                    <p>\
                        <label for="name">Username:</label>\
                        <input type="text" name="db_username" value="" class="text ui-widget-content ui-corner-all">\
                    </p>\
                    <p>\
                        <label for="name">Password:</label>\
                        <input type="password" name="db_password" value="" class="text ui-widget-content ui-corner-all">\
                        <button type="button" id="showDbPassword">Show</button>\
                    </p>\
                </div>\
                <div id="tabs-advanced">\
                    <p>\
                        <label for="name">Wordpress completions:</label>\
                        <input type="checkbox" name="ac_wordpress" value="1" class="text ui-widget-content ui-corner-all">\
                    </p>\
                    <p>\
                        <label for="name">Custom completions:</label>\
                        <input type="text" name="ac_custom" value="" placeholder="e.g. http://domain.com/completions.json" class="text ui-widget-content ui-corner-all">\
                    </p>\
                    <p>\
						<label for="encoding">Encoding</label>\
					    <select name="encoding" class="ui-widget ui-state-default ui-corner-all">\
					    	<option value=""></option>\
					    </select>\
                    </p>\
                    <p>\
                        <label for="name">Revisions per file:</label>\
                        <input type="number" name="revisions" value="" min="-1" max="50" class="text ui-widget-content ui-corner-all">\
                    </p>\
                </div>\
            </div>\
        </div>\
        <input type="submit" tabindex="-1" style="position:absolute; top:-1000px">\
      </form>\
    </div>');

    //defeat chrome autofill
	setTimeout(function(){
		$('#ftp_pass').removeAttr("disabled");
	}, 100);

    //encoding dropdown
    var charsets = preferences.charsets;
    for(var i in charsets) {
        if (charsets.hasOwnProperty(i)) {
            $('#siteSettings select[name=encoding]').append( '<option value="'+i+'">'+charsets[i]+' ('+i+')</option>' );
        }
    }

    //set values
    var defaults = {
        server_type: 'FTP',
        timeout: 10
    };
    var settings = newSite ? defaults : getSettings();

    if(duplicate===true) {
        settings.name = 'Copy of '+settings.name;
        settings.id = '';
    }

    for(i in settings) {
		if (settings.hasOwnProperty(i)) {
		    var field = $('[name='+i+']');
		    switch(field.attr('type')){
		        case 'checkbox':
		            if (settings[i]==1)
		                field.prop('checked', true);
	            break;
	            default:
                    field.val(settings[i]);
                break;
		    }
		}
    }

	$('#logon_password').click(function() {
		$('#ssh_key_container').hide();
	});

	$('#logon_key').click(function() {
		$('#ssh_key_container').show();
	});

    //select ssh key
    $('#sshKey').click(function(){
        $(this).select();
    });

    $('#chooseFolder').button().click(chooseFolder);

    //"Other" split button
    $('#otherMenu').menu().hide();
    $('#otherMenu a').click(function() {
        $('#otherLabel').children('span').text($(this).text());
        $('#other').val($(this).text());
        $('#otherLabel').trigger('click');
    });
    $('#otherLabel').click(function() {
        var menu = $('#otherMenu').show().position({
              my: "left top",
              at: "left bottom",
              of: this
        });
        $( document ).one( "click", function() {
            menu.hide();
        });
        return false;
    });

    //tabs and buttons
    $( "#siteTabs" ).tabs();
    $( "#serverTypeRadio" ).buttonset();
    $( "#stackRadio" ).buttonset();
    $( "#cloudRadio" ).buttonset();
    $( "#authenticationRadio" ).buttonset();

    //git combo
    gitCombo = $( "#git_url_select" ).combobox({
        select: function (event, ui) {
            $('#git_url').val(ui.item.value);
        },
        change: function (event, ui) {
            $('#git_url').val(ui.item.value);
        },
        create: function( event, ui ) {
        }
    });
    loadRepos(settings.git_url);

    $( "#showPassword, #showDbPassword" ).button().click(function(){
        var input = ($( this ).prev());
        if(input.attr('type')==='text') {
            input.attr('type', 'password');
        }else{
            input.attr('type', 'text');
        }
    });

    //toggle fields
    $('#cloud_container label, #serverTypeRadio label').click(function() {
        var category = $(this).prev().prop('checked', true).val(); //make sure radio is checked
        $('input[name=server_type]').val(category);
        updateCategory();
    });

    //trim values
    $('#siteSettings input[type=text]').blur(function(){
        $(this).val($(this).val().trim());
    });

    updateCategory();

    //open dialog
    var dialog = $( "#dialog-site" ).dialog({
        modal: true,
        close: function( event, ui ) {
            $( this ).remove();
        },
        buttons: {
            Connect: test,
            Save: save
        },
        width: 520,
        minWidth: 520,
        minHeight: 300
    });

    //passwords
	function decryptPasswords() {
	    if(settings.ftp_pass) {
		    $('input[name=ftp_pass').val(Aes.Ctr.decrypt(settings.ftp_pass, storage.get('masterPassword'), 256));
	    }

	    if(settings.db_password) {
		    $('input[name=db_password]').val(Aes.Ctr.decrypt(settings.db_password, storage.get('masterPassword'), 256));
	    }
	}

	if (!newSite && prefs.useMasterPassword) {
		if (!storage.get('masterPassword')) {
			return masterPasswordPrompt(decryptPasswords);
		} else {
			decryptPasswords();
		}
	}
}

function active() {
    return currentSite;
}

function getSettings(val) {
    if(!val) {
        val = currentSite;
    }

    var key = isNaN(val) ? 'name' : 'id';

    site = false;
    sites.forEach(function(entry) {
        if(entry[key]==val){
            site = entry;
            return;
        }
    });

    return util.clone(site);
}

function getAjaxOptions(ajaxUrl) {
    var settings = getSettings();
    var params = {};

    if(settings.server_type == 'AJAX' || settings.turbo == 1) {
        if(settings.turbo){
        	if( settings.web_url ){
        		ajaxUrl = settings.web_url+'shiftedit-proxy.php?ModPagespeed=off';
        	}else{
        		prompt.alert({title:lang.errorText, msg:'Missing website URL for proxy, edit site settings and set a website url or disable turbo option.'});
        	}

    		//fixme prompt for master password
    		var prefs = preferences.get_prefs();
    		var pass = prefs.useMasterPassword ? Aes.Ctr.decrypt(settings.ftp_pass, storage.get('masterPassword'), 256) : settings.ftp_pass;

    		params = {
    			user: settings.ftp_user,
    			pass: util.sha1(pass)
    		};
        }else{
        	ajaxUrl = settings.domain;

        	if( settings.encryption == '1' ){
        		ajaxUrl = 'https://'+ajaxUrl;
        	}else{
        		ajaxUrl = 'http://'+ajaxUrl;
        	}
        }

        if(util.startsWith(ajaxUrl, 'http://') && ssl.check_blocked()){
            prompt.alert({title:'Proxy Blocked', msg:'Click Shield icon in address bar, then "Load Unsafe Script"'});
        }
    }

    return {
        site: settings.id,
        dir: settings.dir,
        url: ajaxUrl,
        params: params
    };
}

exports.init = init;
exports.load = load;
exports.open = open;
exports.active = active;
exports.getSettings = getSettings;
exports.getAjaxOptions = getAjaxOptions;
exports.getdirectFn = function(){ return directFn; };
exports.definitions = definitions;

});
