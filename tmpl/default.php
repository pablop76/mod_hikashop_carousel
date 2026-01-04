<?php
defined('_JEXEC') or die;

use Joomla\CMS\Router\Route;

$document = $this->app->getDocument();
$wa = $document->getWebAssetManager();
$wa->getRegistry()->addExtensionRegistryFile('mod_hikashop_carousel');
$wa->useStyle('mod_hikashop_carousel.custom-style', ['position' => 'after'], [], ['core']);
$wa->useScript('mod_hikashop_carousel.custom-js');

if (!@include_once (rtrim(JPATH_ADMINISTRATOR, DS) . DS . 'components' . DS . 'com_hikashop' . DS . 'helpers' . DS . 'helper.php')) {
    return false;
}
\Joomla\CMS\HTML\HTMLHelper::_('bootstrap.carousel', '.carousel', []);

$title = $params->get('titlehikashopcarousel');
$image = $params->get('imagesubtitlehikashopcarousel');
$description = $params->get('descriptionhikashopcarousel');
$hikaproduktmenuitem = (int)$params->get('hikaproduktmenuitem'); // ID pozycji menu
$allProductsButtonText = trim((string) $params->get('allproductsbuttontext', ''));
$descriptionlength = $params->get('descriptionlength');
$bgcorousellefttop = $params->get('bgcorousellefttop');
$bgcorouselbottomright = $params->get('bgcorouselbottomright');

$productClass = hikashop_get('class.product');

/**
 * Funkcja przekształca elementy listy HTML na tekst oddzielony przecinkami.
 */
function convertHtmlListToText(string $html, string $encoding = 'UTF-8'): string {
    $doc = new DOMDocument();
    @$doc->loadHTML('<?xml encoding="' . $encoding . '">' . $html);
    $items = $doc->getElementsByTagName('li');
    return implode(', ', array_map(fn($item) => trim($item->textContent), iterator_to_array($items)));
}

function truncateText($text, $maxLength, $appendDots = true) {
    if (mb_strlen($text, 'UTF-8') > $maxLength) {
        $text = mb_substr($text, 0, $maxLength, 'UTF-8');
        if ($appendDots) {
            $text .= '...';
        }
    }
    return $text;
}

function formatWeightValue($value): string {
    $value = trim((string)$value);
    if ($value == '') {
        return '';
    }

    // Only trim trailing zeros when a decimal separator exists.
    if (strpos($value, '.') !== false || strpos($value, ',') !== false) {
        $value = rtrim(rtrim($value, '0'), ',.');
    }

    return $value;
}
?>
<div class="uk-section hikashop-carousel-section">
    <div class="uk-container uk-container-xlarge uk-position-relative">
        <img class="uk-position-large uk-position-top-left uk-visible@s" src="<?php echo $bgcorousellefttop->imagefile ?>"
            <?php if (isset($bgcorousellefttop->alt_empty)): ?> <?php else: ?>
            alt="<?php echo $bgcorousellefttop->alt_text ?>" <?php endif ?> width="200">
        <img class="uk-position-large uk-position-bottom-right" src="<?php echo $bgcorouselbottomright->imagefile ?>"
            <?php if (isset($bgcorouselbottomright->alt_empty)): ?> <?php else: ?>
            alt="<?php echo $bgcorouselbottomright->alt_text ?>" <?php endif ?> width="100">
        <div>
            <h2 class="uk-text-center"><?php if($title){echo $title;}else{echo "";} ?></h2>
            <img class="uk-align-center" src="<?php echo $image->imagefile ?>" alt="image icon" width="90">
            <?php echo $description ?>
        </div>
        <div class="uk-padding-large uk-padding-remove-left uk-padding-remove-right uk-position-relative uk-visible-toggle"
            tabindex="-1" data-uk-slider="autoplay: true; autoplay-interval: 3000; active:first; center:true">
            <div class="uk-slider-items uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-5@xl uk-grid uk-grid-match">
                <?php 
                foreach ($products as $item) {
                    $product = $productClass->getProduct($item->product_id);
                    foreach($product->images as $image) {
                        $result = convertHtmlListToText($product->product_description);
                        $weightValue = formatWeightValue($product->product_weight);
                        $weightUnit = !empty($product->product_weight_unit) ? $product->product_weight_unit : '';
                        $shortText = truncateText($result, $descriptionlength);
                        $produdctId = $product->product_id;
                        $produdctAlias = $product->product_alias;

                        // tu budujemy poprawny link z Itemid
                        $linkQuery = 'product&task=show&cid=' . $produdctId . '&name=' . $produdctAlias . '&Itemid=' . $hikaproduktmenuitem;
                        $sefUrl    = Route::_( hikashop_completeLink($linkQuery) );
                ?>
                <div class="hikashop-card-carousel">
                    <div class="uk-card uk-card-default">
                        <div class="uk-card-media-top">
                            <img src="<?php echo JURI::base(true).'images/com_hikashop/upload/'.$image->file_path ?>"
                                width="1800" height="1200" alt="">
                        </div>
                        <div class="uk-card-body">
                            <h3 class="hikashop-card-title"><?php echo $product->product_name ?></h3>
                            <?php if($weightValue !== '' && (float)str_replace(',', '.', $weightValue) > 0): ?>
                                <div class="hikashop-card-weight">
                                    <?php echo $weightValue; ?><?php echo $weightUnit !== '' ? ' ' . JText::_($weightUnit) : ''; ?>
                                </div>
                            <?php endif ?>
                            <p><?php echo $shortText; ?></p>
                            <div class="uk-text-center">
                                <a class="uk-button uk-button-default button-1" href="<?php echo  $sefUrl ?>">POKAŻ WYRÓB</a>
                            </div>
                        </div>
                    </div>
                </div>
                <?php
                    }
                }
                ?>
            </div>
            <a class="uk-position-center-left uk-position-small uk-hidden-hover" href data-uk-slidenav-previous data-uk-slider-item="previous"></a>
            <a class="uk-position-center-right uk-position-small uk-hidden-hover" href data-uk-slidenav-next data-uk-slider-item="next"></a>
        </div>
        <?php if ($allProductsButtonText !== '' && $hikaproduktmenuitem > 0): ?>
            <div style="text-align: center;position:relative;z-index: 9; height: 200px">
                <a href="index.php?Itemid=<?php echo $hikaproduktmenuitem ?>" class="button"><?php echo htmlspecialchars($allProductsButtonText, ENT_QUOTES, 'UTF-8'); ?></a>
            </div>
        <?php endif; ?>
    </div>
</div>
