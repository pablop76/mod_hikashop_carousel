<?php
namespace Pablop76\Module\Hikashopcarousel\Site\Dispatcher;

\defined('_JEXEC') or die;

use Joomla\CMS\Dispatcher\DispatcherInterface;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\Input\Input;
use Joomla\Registry\Registry;
use Pablop76\Module\Hikashopcarousel\Site\Helper\HikashopcarouselHelper;


class Dispatcher implements DispatcherInterface
{
    protected $module;
    
    protected $app;

    public function __construct(\stdClass $module, CMSApplicationInterface $app, Input $input)
    {
        $this->module = $module;
        $this->app = $app;
    }
    public function dispatch()
    {
        $db = Factory::getContainer()->get('DatabaseDriver');
        $query = $db->getQuery(true)
            ->select('*')
            ->from($db->quoteName('#__hikashop_product'))
            ->where($db->quoteName('product_published') . ' = 1')
            ->setLimit(30);
        $db->setQuery($query);
        $products = $db->loadObjectList();
        $params = new Registry($this->module->params);
        require ModuleHelper::getLayoutPath('mod_hikashop_carousel');
    }
}
