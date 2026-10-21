<script>
import {startUnread,stopUnread} from './services/notification-badge';
export default {
  onLaunch() {
    console.log('Campus Meal Mate app launched')
  },
  onShow(){startUnread()},
  onHide(){stopUnread()}
}
</script>

<style>
@import './styles/global.css';
</style>
