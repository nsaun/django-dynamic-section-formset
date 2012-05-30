/**
 * jQuery Section Formset 1.0
 * @requires jQuery 1.2.6 or later, jquery.formset.js, jquery.jeditable.js
 * 
 * Based off of code originally developed by Stan Madueke, adapted for 
 * section support by Nick Saunders.
 *
 * Copyright (c) 2012, Nick Saunders
 * All rights reserved.
 *
 * Licensed under the New BSD License
 * See: http://www.opensource.org/licenses/bsd-license.php
 */
;(function($) {
    $.fn.section_formset = function(opts)
    {
        var options = $.extend({}, $.fn.section_formset.defaults, opts),
            /* Set of elements this is being applied to */
            $$ = $(this),
            topSelector = $$.selector,

            createSection = function() {
				/* Clone the initial section (which we won't allow deletion of).*/
				initialSection=$(topSelector).first();
				
				/* Copy the item */
				newItem = cloneSection(initialSection);
				
				/* Insert the new section at the end of menu sections */
				$(topSelector + ':last').after(newItem);
				
				/* Rename title and delete children */
				newItem.find('.' + options.sectionNameClass).text(options.newSectionInitialText);
				newItem.children().filter('.dynamic-form').remove();
				
				/* Populate section with a few new children */
				populateWithChildren(newItem);
				
				/* Add a delete section button to the end of the added section */
				newItem.append(
					'<div><a class="delete-section"'+
					' href="javascript:void(0)">delete section</a></div>');
				
				/* Lastly, click the new section title for edit */
				newItem.find('.' + options.sectionNameClass).click();
            },
            
			/**
			 * Clone a menu item section.
			 * 
			 * @param[in] source - item to copy
			 * @return new item object in DOM tree.
			 */
            cloneSection = function(source)
			{
				var newItem = source.clone(true);
				
				/* jeditable events dont carry over gracefully - it will select the wrong element.
				 * Unbind the event from the field and reregister the heading as editable.
				 */
				newItemSectionField = newItem.children('.' + options.sectionNameClass).first();
				newItemSectionField.unbind('click');
				newItemSectionField.editable(_sectionNameUpdated, options.editableSettings);
				
				/* Cloning needs to account for custom attributes.  The reset attribute
				 * (which is stored on the actual DOM object by the jeditable plugin)
				 * won't be cloned automatically by jquery's clone function, so explicitly
				 * copy this attribute or the cancel button won't work.'
				 */
				newItemSectionField.reset = 
					source.children('.' + options.sectionNameClass)[0].reset;
					
				return newItem;
			},
			
			deleteSection = function()
			{
				/* First delete all rows individually, going through the
				 * graceful deletion path for jquery.formset.js.
				 */
				$(this).parents(topSelector).find('.delete-row').click();
				$(this).parents(topSelector).remove();
			},
			
			/**
			 * Populate a new item with children
			 * 
			 * @param[in] item to attach new rows to
			 */
			populateWithChildren = function(item)
			{
				for(i=0; i<options.newSectionInitialCount; i++)
				{
					item.find('.add-row').click();
				}
			}
			
			resetInitialFormCount = function()
			{
				$("input[id$='INITIAL_FORMS']").val(0)
			}
			
			_sectionNameUpdated = function(value, settings)
			{
				/* Find immediate parent menu_section div */
				sectionTop = $(this).parents(topSelector);
				sectionTop.find('.' + options.formSectionNameFieldClass).each(function(index) {
					this.value = value;
				});
				
				if(value == options.newSectionInitialText)
				{
					alert('Please update the section name.');
					/* TODO: make this re-edit the section title */
				}
				
				if (options.sectionNameUpdated) {
					options.sectionNameUpdated(this, value, settings)
				}
	
				return value;
			},
			
			/* From an item at the dynamic-form level, determine the current section index
			 * off of the previous item.  Also, handles cases where this is the first item.
			 */
			getSectionIndex = function(item)
			{
				/* Get previous item's index, and increment that value to new index 
				 * (or handle base case) */
				var prevItem = item.prev('.dynamic-form');
				
				if (prevItem.length < 1)
				{
					/* First item, therefore this has an index of 0 */
					return 0;
				}
				
				var idxStr = prevItem.find('.' + options.formSectionFieldIndexClass).val();
				var idx = parseInt(idxStr.match(/\d+/)[0]);
				
				return idx + 1;
			},
			
			/* Registered callback to handle when a new form item is added */
			handleItemAdded = function(newItem)
			{	
				/* Add section name attribute to menu item, if empty */
				var itemSection = newItem.find('.' + options.formSectionNameFieldClass);
				if (itemSection.val() == '')
				{
					itemSection.val(
						newItem.parents('.' + options.sectionClass).find('.' + options.sectionNameClass).text());
				}
			
				/* Fill in section index value */
				newItem.find('.' + options.formSectionFieldIndexClass).first().val(
					getSectionIndex(newItem) );
			}
			
			/* Registered callback to handle when a form item is removed */
			handleItemRemoved = function(deletedItem)
			{
				debug.log('Removing node: ' + deletedItem);
				
				/* Update all entries after the index that was removed */
				deletedItem.nextAll('.dynamic-form').each(function(index, value) {			
					/* Update section index value */
					var sectionIndex = $(this).find('.' + options.formSectionFieldIndexClass);
					
					var idx = parseInt(sectionIndex.val().match(/\d+/)[0]);
					
					/* Decrement value */
					sectionIndex.val(idx - 1);
				});
			};
			
		/******* INITIALIZE ********/
			
		/* Attach pre/post remove events */
		options.formsetSettings.added = handleItemAdded;
		options.formsetSettings.beforeremove = handleItemRemoved;
		options.formsetSettings.formCssClass = options.formsetCssClass;
		

		/* Apply formset plugin to the selected formset section */
        formset = $$.find('.' + options.formsetNameClass)
            .formset(options.formsetSettings);
		
		options._formset = formset;
        
        /* Apply editable plugin to all editable section titles */    
        $$.find('.' + options.sectionNameClass)
          		.editable(_sectionNameUpdated, options.editableSettings);
	  	
	  	/* Here, section name fields could be initialized via javascript based on the section
	  	 * fields that exist,  but this is avoided to reduce the number of changed fields.
	  	 * Django detects changes, and if the javascript is changing form data, it will behave
	  	 * as if the user has made changes (and complain about empty fields).  Instead,
	  	 * the extra_forms fields are used rather than the initial_forms (on the server side).
	  	 */
	  	
		/* Set the initial form count to 0.  This is a way around the fact that
		 * the django formset is populated with some initial data instead of using
		 * extra forms.  This is all because each form in the formset must have a
		 * differing index value, meaning "extra" forms cannot be used in the formset.
		 */
		resetInitialFormCount();
		
        $$.each(function(i) {
        	// process item found
        });

        if ($$.length) {
			// do only if there are items
        }
        
        /* make generic and relative to current tree */
        $('#' + options.newSectionButtonId).live('click', createSection);
        
        /* Attach the delete event */
        $('.delete-section').live('click', deleteSection);

        return $$;
    }

    /* Setup plugin defaults */
    $.fn.section_formset.defaults = {
    	/* Selectors (required) */
    	sectionClass: null,                   /* Selector identifying a top-level section div */
    	sectionNameClass: null,               /* Selector for editable section names */
		formSectionNameFieldClass: null,      /* Class for the section name field */
		formSectionFieldIndexClass: null,     /* Class for the section index field */
		formsetNameClass: null,               /* Section identifier for the formset container */
		newSectionButtonId: null,             /* Identifies the button used for creating a section */
		
		/* Functions (optional) */
    	sectionNameUpdated: null,             /* Function called every time a section name is updated.  */
	    
	    /* Constant values (optional) */
	    newSectionInitialText: 'New Section', /* Initial text displayed for a new section title */
	    newSectionInitialCount: 3,            /* Initial number of forms added to a new section */
		
		/* Formset Settings - (optional)
		 * 
		 * The following options may be overridden:
		 *  -addText
		 *  -deleteText
		 *  -extraClasses
         * Overriding other options will likely cause problems with this plugin.
         */ 
    	formsetSettings: null,                /* Passed to jquery.formset.js (optional) */
    	
    	/* Editable settings - (optional)
    	 * 
    	 * Any settings may be overridden.
    	 */
	    editableSettings: null,               /* Settings to pass to jquery.jeditable.js (optional) */
    };
})(jQuery)
