
jQuery.cookie = function(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};

var submenu_cache = new Array();

$(document).ready(function() {
    
    function save_expanded() {
        var col = [];
        $('a.expanded').each(function() {
            col.push(this.id.substring(1));
        });
        // expire in 12 days
        $.cookie('tree_expanded', col.join(','), {"expires":12});
    }
    
    function remove_children(id) {
        $('.child-of-' + id).each(function() {
            remove_children(this.id.substring(9));
            $(this).remove();
        });
    }
    
    function get_children(id, list) {
        $('.child-of-' + id).each(function() {
            list.push(this);
            get_children(this.id.substring(9), list);
            return list
        });
    }
    
    var selected_page = false;
    var action = false;
    
    // let's start event delegation
    $('#changelist').click(function(e) {
        // I want a link to check the class
        if(e.target.tagName == 'IMG' || e.target.tagName == 'SPAN')
            var target = e.target.parentNode;
        else
            var target = e.target;
        var jtarget = $(target);
        
        if(jtarget.hasClass("move")) {
            var page_id = e.target.id.split("move-link-")[1];
            selected_page = page_id;
            action = "move";
            $("#changelist table").removeClass("table-selected");
            $('tr').removeClass("selected").removeClass("target");
            $('#page-row-'+page_id).addClass("selected");
            var children = [];
            get_children(page_id, children);
            for(var i=0; i < children.length; i++) {
                $(children[i]).addClass("selected");
            }
            $("#changelist table").addClass("table-selected");
            return false;
        }
        
        if(jtarget.hasClass("addlink")) {
            $("tr").removeClass("target");
            $("#changelist table").removeClass("table-selected");
            var page_id = target.id.split("add-link-")[1];
            selected_page = page_id;
            action = "add";
            $('tr').removeClass("selected");
            $('#page-row-'+page_id).addClass("selected");
            $('.move-target-container').hide();
            $('#move-target-'+page_id).show();
            return false;
        }
        
        if(jtarget.hasClass("move-target")) {
            if(jtarget.hasClass("left"))
                var position = "left";
            if(jtarget.hasClass("right"))
                var position = "right";
            if(jtarget.hasClass("first-child"))
                var position = "first-child";
            var target_id = target.parentNode.id.split("move-target-")[1];
            if(action=="move") {
                var msg = $('<span>Please wait...</span>');
                $($('#page-row-'+selected_page+" td")[0]).append(msg);
                $.post(selected_page+"/move-page/", {
                        position:position,
                        target:target_id
                    },
                    function(html) {
                        $('#changelist').html(html);
                        var msg = $('<span>Successfully moved</span>');
                        var message_target = '#page-row-'+selected_page
                        if(!$(message_target).length)
                            message_target = '#page-row-'+target_id
                        $(message_target).addClass("selected");
                        $($(message_target+" td")[0]).append(msg);
                        msg.fadeOut(5000);
                    }
                );
                $('.move-target-container').hide();
            }
            if(action=="add") {
                var query = $.query.set('target', target_id).set('position', position).toString();
                window.location.href += 'add/'+query;
            }
            return false;
        }
        
        if(jtarget.hasClass("expand-collapse")) {
            var the_id = jtarget.attr('id').substring(1);
            jtarget.toggleClass('expanded');
            if(jtarget.hasClass('expanded')) {
                if (submenu_cache[the_id]){
                    $('#page-row-'+the_id).after(submenu_cache[the_id]);
                } else {
                    $.get(the_id+"/sub-menu/",
                        function(html) {
                            $('#page-row-'+the_id).after(html);
                            submenu_cache[the_id] = html;
                            /* TODO: recursively re-expand submenus according to cookie */
                        }
                    );
                }
            } else {
                remove_children(the_id);
            }
            save_expanded();
            return false;
        };
        
        return true;
    });
    $('#changelist').change(function(e) {
        var target = e.target;
        var jtarget = $(target);
        if(jtarget.hasClass("publish-select")) {
            var p = jtarget.attr("name").split("status-")[1];
            var img = $('img', jtarget.parent())[0];
            img.src = img.src.replace("icon-draft.gif", "indicator.gif").replace("icon-published.gif", "indicator.gif").replace("icon-hidden.gif", "indicator.gif");
            img.alt = "Busy";
            index = target.selectedIndex;

            if (index == 0)
                statusopt = "draft";
            else if (index == 1)
                statusopt = "published";
            else if (index == 2)
                statusopt = "hidden";
            // if I don't put data in the post, django doesn't get it
            $.post(p+"/change-status-"+statusopt+"/", {1:1}, function(val) {
                img.alt = statusopt;
                switch(val) {
                    case '0': img.src = img.src.replace("indicator.gif", "icon-draft.gif"); break;
                    case '1': img.src = img.src.replace("indicator.gif", "icon-published.gif"); break;
                    case '3': img.src = img.src.replace("indicator.gif", "icon-hidden.gif"); break;
                    default: 
                        alert(val);
                    break;
                }
            });
            return true;
        }

        return true;
    });
});
