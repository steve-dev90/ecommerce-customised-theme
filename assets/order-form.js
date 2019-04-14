$(function() {

  // *** LOW INVENTORY ALERT ***
   $('.quantity-field').change(function() {
    var max = parseInt($(this).find('input').attr('maximum'), 10);
    var value = parseInt($(this).find('input').val(), 10) || 0;
    if (value > max) {
      $(this).parents('td').find('.order-form__tablecell--inventorytext').show()
    }
  });

  $('.order-form__tablecell--inventorytext').hover(function() {
    $(this).fadeOut();
  });

  // *** ORDER FORM MENU BAR STICKY
  var barOffset = $('#StickNavWrapper').height();
  var sticky = $('#StickyOrderFormBar').offset().top - barOffset;
  $(window).on('scroll.stickynav', function() {
    var scroll = $(window).scrollTop();
    if (scroll >= sticky) {
      $('#StickyOrderFormBar').addClass('order-form__menubar--sticky');
      $('#StickyOrderFormBar').css("top", barOffset);
     } else {
      $('#StickyOrderFormBar').removeClass('order-form__menubar--sticky');
    }
  });

  // *** COLLECTION SELECT ***
  $('#select-collection').change(function() {
    document.location.href = '/pages/order-form/'+ $(this).val();
  });

  // *** REMINDER TO SAVE TO CART IF NAVIGATING AWAY FROM PAGE ***
  $('.pagination').mouseover(function() {
    $('.save-to-cart').find('.order-form__tablecell--popuptext').show()
  });

  // *** ORDER FORM LINE ITEM SELECT MODAL ***
  var selectedRow
  $('.configure-options').click(function(event) {
    event.preventDefault()
    selectedRow = $(this).parents('tr')
    $('#order-form-modal').addClass('modal--is-active')
  });

  function closeModal() {
    saveRowProperties();
    printRowProperties();
    $('#order-form-modal').removeClass('modal--is-active');
  };

  $('.order-form-modal__close').click(function(event) {
    event.preventDefault();
    closeModal();
  });

  $(window).click(function(event) {
    if ($(event.target).attr('id') == 'order-form-modal') {
      closeModal();
    }
  });

  function saveRowProperties() {
    $('.line-item__selector').each(function() {
      var line_prop_name = $(this).find('label').attr('name');
      if ($(this).find('input').length > 0) {
        line_prop_value = $(this).find('input:checked').val();
      }
      if ($(this).find('select').length > 0) {
        line_prop_value = $(this).find('select').val();
      }
      if ($(this).find("input[type='checkbox']").length > 0 && !line_prop_value) {
        line_prop_value = 'No';
      }
      selectedRow.data(line_prop_name, line_prop_value);
    })
    console.log(selectedRow.data());
  };

  function printRowProperties() {
    var line_prop_html = '';
    $.each(selectedRow.data(), function(key, value) {
      if (value.includes('#')) {
        line_prop_html += "<p class='order-form__tablecell--text'><strong>" + key + "</strong>: " +
          "<span style='background-color:" + value + "; color:transparent;'>xxxxx</span></p>";
      } else {
        line_prop_html += "<p class='order-form__tablecell--text'><strong>" + key + "</strong>: " + value + '</p>';
      }
    })
    $(selectedRow).find('.selected-line-properties').html(line_prop_html);
  };

  // *** PRODUCT VARIANT SELECT ***
  var variantParameterIds = ['p', 'pm', 'q', 'qm'];

  $( document ).ready(function() {
    url = $(location).attr("href").split("/").slice(-1)[0].split("?")[0]
    selector = "#select-collection option[value=" + url +"]"
    $(selector).attr('selected', 'selected');

    $("tr[row='1']").show();
    $('.price').hide();
    $('.quantity-field').hide();

    $('tr').each(function() {
      var rowElement = $(this);
      var variantId = rowElement.find('select').val() || $(this).find('data').val();
      $.each(variantParameterIds, function(index, value) {
        variantParameterId = '#' + value + '-' + variantId + '-' + rowElement.attr('row');
        $(variantParameterId).show();
      });
    });
  });

  // Change the price and quantity to align with the selected option
  $('select').change(function() {
    var rowElement = $(this)
    $.each(variantParameterIds, function(index, value) {
      var variantParameterId = '#' + value + '-' + rowElement.val() + '-' + rowElement.parents('tr').attr('row');;
      $(variantParameterId).siblings().hide();
      $(variantParameterId).show();
    });
  });

  // Add another row if selected variant has line item properties or options
  $('input').change(function() {
    var quantity = $(this).val();
    if (quantity > 0) {
      $(this).parents('tr').next().fadeIn();
  	}
  });

  // *** RUNNING CART TOTAL ***
  // Get parameter used in order processing as well
  function getParameter (parameter, selector) {
    if (parameter.includes('m')) {
      selectId = '#select-'+ $(selector).attr('row') + '-' + $(selector).attr('product') + 'm'
    } else {
      selectId = '#select-'+ $(selector).attr('row') + '-' + $(selector).attr('product')
    }
    var variantId = $(selectId).val() || $(selector).find('data').val();
    var parameterId = '#'+ parameter + '-' + variantId + '-' + $(selector).attr('row');

    if (parameter == "" ) {
      return variantId
    } else {
      return $(parameterId);
    }
  };

  var initailCartTotal = parseFloat($('.cart-total').text().replace('$','').replace(',',''));

  $('input').change(function() {
    var cartTotal = 0
    $('tr').each(function() {
      var price = parseFloat(getParameter('p', this).text().slice(2)) ||
        parseFloat(getParameter('pm', this).text().slice(2));
      var quantity = parseInt(getParameter('q', this).find('input').val()) ||
        parseInt(getParameter('qm', this).find('input').val());

      cartTotal += price*quantity;
    });
    cartTotal += initailCartTotal
    $('.cart-total').html('$' + cartTotal.toFixed(2));
  });

  // ***** ORDER AND SAVE TO CART PROCESSING *****
  // Source: https://help.shopify.com/en/themes/development/getting-started/using-ajax-api#youre-building-a-quick-order-form-beware
  var cartQueue = [];

  function moveAlong (pageDivert) {
    if (cartQueue.length) {
      var request = cartQueue.shift();
      console.log(request);
      addItem(request.variantId, request.quantity, request.properties, pageDivert);
    }
    else {
      document.location.href = pageDivert;
    }
  };

  function addItem (variantId, quantity, properties, pageDivert) {
    jQuery.post( '/cart/add.js', { quantity: quantity, id: variantId, properties: properties}, null, "json")
    .done(function(response) {
      console.log('Post Done!', response);
      moveAlong(pageDivert);
    });
  }

  function requiredErrorMessage (el) {
    el.find('.order-form__tablecell--popuptext').show()
    $('.order-form__error-message').fadeIn()
  }

  // Hide popup error message on moveover
  $('.order-form__tablecell--popuptext').hover(function() {
    $(this).fadeOut();
  });

  $('#post-order').click(function(event){
    event.preventDefault();
    processOrders('/checkout');
  });

  $('#post-to-cart').click(function(event){
    event.preventDefault();
    processOrders('/cart');
  });

  function processOrders (pageDivert) {

    var requiredItemsSelected = true;
    var requiredLineProperties = []
    $.each(['0','1','2','3'], function(index, value) {
      var requiredLineProperty = $('table').attr('data-required-' + value)
      if (requiredLineProperty) {
        requiredLineProperties.push(requiredLineProperty)
      }
    });

    $('tr').each(function() {
      var currentRow = $(this);
      var quantity = parseInt(getParameter('q', currentRow).find('input').val()) ||
        parseInt(getParameter('qm', currentRow).find('input').val());
      var properties = $(currentRow).data()

      if ( quantity > 0 ) {
        if (currentRow.find('.configure-options').length > 0) {
          $.each(requiredLineProperties, function(index, requiredLineProperty) {
            if (!properties[requiredLineProperty]) {
              requiredErrorMessage(currentRow);
              requiredItemsSelected = false;
              return false
            }
          });
        }

        cartQueue.push({
          variantId: getParameter('', currentRow) || currentRow.find('data').val(),
          quantity: quantity,
          properties: properties
        });
      }
    });

    if (requiredItemsSelected) {
      moveAlong(pageDivert);
    } else {
      cartQueue = [];
    }
  };

});