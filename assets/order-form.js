$(function() {

  // Alerts customers of low inventory
   $('.quantity-field').change(function() {
    var max = parseInt($(this).attr('maximum'), 10);
    var value = parseInt($(this).val(), 10) || 0;
    if (value > max) {
      $(this).parents('td').find('.order-form__tablecell--popuptext').show()
    }
  });

  // Page order menu bar sticky
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

  // Change displayed collection
  $('#select-collection').change(function() {
    document.location.href = '/pages/order-form/'+ $(this).val();
  });

  // Remind customer to save item to cart if leaving page
  $('.pagination').mouseover(function() {
    $('.save-to-cart').find('.order-form__tablecell--popuptext').show()
  });

  // Order form popup
  var selectedRowCell
  $('.configure-options').click(function(event) {
    event.preventDefault()
    selectedRowCell = $(this).parents('td')
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
      if ($(this).find('#custom').length > 0 && !line_prop_value) {
        line_prop_value = 'No';
      }
      selectedRowCell.data(line_prop_name, line_prop_value);
    })
    console.log(selectedRowCell.data());
  };

  function printRowProperties() {
    var line_prop_html = '';
    $.each(selectedRowCell.data(), function(key, value) {
      line_prop_html += "<p class='order-form__tablecell--line-properties'><strong>" + key + "</strong>: " + value + '</p>';
    })
    $(selectedRowCell).find('.selected-line-properties').html(line_prop_html);
  };

  //Initial form setup
  var variantParameterIds = ['p', 'pm', 'q', 'qm'];

  $( document ).ready(function() {
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

  // Running cart total
  var getParameter = function(parameter, selector) {
    var variantId = $(selector).find('select').val() || $(selector).find('data').val();
    // console.log(variantId)
    var parameterId = '#'+ parameter + '-' + variantId + '-' + $(selector).attr('row');
    return $(selector).find(parameterId);
  };
  var initailCartTotal = parseFloat($('.cart-total').text().replace('$','').replace(',',''));

  $('.quantity-field').change(function() {
    var cartTotal = 0
    $('tr').each(function() {
      var price = parseFloat(getParameter('p', this).text().slice(2)) ||
        parseFloat(getParameter('pm', this).text().slice(2));
      var quantity = parseInt(getParameter('q', this).val()) ||
        parseInt(getParameter('qm', this).val());
      cartTotal += price*quantity;
    });
    cartTotal += initailCartTotal
    $('.cart-total').html('$' + cartTotal.toFixed(2));
  });

  // ***** ORDER AND SAVE TO CART PROCESSING *****
  // Source: https://help.shopify.com/en/themes/development/getting-started/using-ajax-api#youre-building-a-quick-order-form-beware
  var cartQueue = [];

  var moveAlong = function(goToCheckOut) {
    if (cartQueue.length) {
      var request = cartQueue.shift();
      console.log(request);
      addItem(request.variantId, request.quantity, request.properties, goToCheckOut);
    }
    else if (goToCheckOut) {
      document.location.href = '/checkout';
    }
  };

  var addItem = function(variantId, quantity, properties, goToCheckOut) {
    jQuery.post( '/cart/add.js', { quantity: quantity, id: variantId, properties: properties}, null, "json")
    .done(function(response) {
      console.log('Post Done!', response);
      moveAlong(goToCheckOut);
    });
  }

  var requiredErrorMessage = function(el) {
    el.find('.order-form__tablecell--popuptext').show()
    $('.order-form__error-message').fadeIn()
  }

  // Hide popup error message on moveover
  $('.order-form__tablecell--popuptext').hover(function() {
    $(this).fadeOut();
  });

  $('#post-order').click(function(event){
    event.preventDefault();
    processOrders(true);
  });

  $('#post-to-cart').click(function(event){
    event.preventDefault();
    processOrders(false);
  });

  function processOrders (goToCheckOut) {

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
      var quantity = parseInt(getParameter('q', currentRow).val());
      var properties = $(currentRow).find('.line-properties').data()

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
          variantId: currentRow.find('select').val() || currentRow.find('data').val(),
          quantity: quantity,
          properties: properties
        });
      }
    });

    if (requiredItemsSelected) {
      moveAlong(goToCheckOut);
    } else {
      cartQueue = [];
    }
  };

});