<!--
@copyright (c) 2022 by Robert Bosch GmbH. All rights reserved.

The reproduction, distribution and utilization of this file as
well as the communication of its contents to others without express
authorization is prohibited. Offenders will be held liable for the
payment of damages and can be prosecuted. All rights reserved
particularly in the event of the grant of a patent, utility model
or design.
-->
<template>
<div>
    <div class="m-3">
        <div class="text-center">
            <h3> Select in which results you are interested </h3>
            <p>
                <b>Jobs</b>: Get an overview about specific pipeline runs with related evaluations,
                <b>Evaluations</b>: Search for specific evaluations
            </p>
            <b-button-group class="w-75">
                <b-button
                    class="primary_button"
                    v-for="button in resultButtons"
                    :key="button.id"
                    :pressed.sync="button.pressed"
                    @click="updateActiveButton(button)"
                >
                    {{button.label}}
                </b-button>
            </b-button-group>
            <hr>
            <p>
                Select the <b>timeframe</b> you are interested in
            </p>
            <vue-ctk-date-time-picker class="w-50"
                v-model="selectedTimeInfo"
                :key="'date-time-picker-' + dateTimePickerKey"
                :range="true"
                :no-button="true"
                :no-keyboard="true"
                :auto-close="true"
                :shortcut="selectedShortcut"
                format="YYYY-MM-DDTHH:mm:ssZ"
            />
        </div>
        <br>
        <hr>
        <p class="text-center">Add <b>additional filters</b> to make your results more detailed</p>
        <b-row align-v="center" class="text-left">
            <b-col cols="2">
                <h4 class="my-3">Quick filters</h4>
            </b-col>
            <b-col>
                <button class="primary_button curved mr-2"
                    v-for="filter in quickFilters" :key="filter.id"
                    @click="addQuickFilter(filter)"
                >
                    {{filter.label}}
                </button>
            </b-col>
        </b-row>
        <b-row align-v="center" class="text-left">
            <b-col cols="2">
                <h4 class="my-3">Add filters</h4>
            </b-col>
            <b-col cols="4">
                <treeselect class="w-100"
                    v-model="selectedFilter"
                    :options="optionFilters"
                    :multiple="false"
                    :show-count="true"
                    @input="addFilter"
                />
            </b-col>
        </b-row>
        <b-row class="mb-1" v-for="field in filters" :key="field">
            <b-col cols="2">
                <span class="align-middle" v-if="field === 'tags__name'">tags</span>
                <span class="align-middle" v-else>{{field}}</span>
            </b-col>
            <b-col class="field-col">
                <treeselect :instanceId="field" :placeholder="field" :ref="'treeselect-'+field"
                            v-model="config[field]"
                            :async="true"
                            :load-options="loadOptions"
                            :defaultOptions="defaultOptions[field]"
                            :multiple="(field === 'tags__name')"
                            @select="clearSearchQuery(field)"
                            @input="updateFilterConfig">
                </treeselect>
            </b-col>
            <b-col cols="1">
                <b-button class="mx-1" @click="removeFilter(field)" variant="outline-danger">
                    <i class="fa fa-trash"></i>
                </b-button>
            </b-col>
        </b-row>
    </div>
</div>
</template>

<style scoped>
    .active {
        background: #a2bbff !important;
    }
    .browser-card {
        min-width: 180px !important;
        background-color:rgb(82, 90, 90) !important;
        color: #b7c6c6;
    }
    .browser-card-header {
        font-size:18px;
        color: #d6e6e6;
    }
</style>

<script>

import Treeselect from '@riophae/vue-treeselect';
import {ASYNC_SEARCH} from '@riophae/vue-treeselect';

import axios from 'axios';
import _ from 'lodash';

import VueCtkDateTimePicker from 'vue-ctk-date-time-picker';
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css';
import {subDirectory} from '../../subDirectory.js';


export default {
    components: {
        VueCtkDateTimePicker,
        Treeselect,
    },
    data() {
        return {
            resultButtons: [
                {
                    id: 'EvaluationJob',
                    label: 'Jobs',
                    pressed: true,
                },
                {
                    id: 'Evaluation',
                    label: 'Evaluations',
                    pressed: false,
                },
            ],
            quickFilters: [
                {
                    id: 'buildNode',
                    label: 'Build Node',
                    config: {
                        'tags__name': ['BuildNode'],
                    },
                },
                {
                    id: 'cluster',
                    label: 'Cluster',
                    config: {
                        'tags__name': ['Cluster'],
                    },
                },
                {
                    id: 'gatekeeper',
                    label: 'Gatekeeper',
                    config: {
                        'tags__name': ['Gatekeeper'],
                    },
                },
                {
                    id: 'masterFeedback',
                    label: 'Master Feedback',
                    config: {
                        'tags__name': ['Masterfeedback'],
                    },
                },
                {
                    id: 'fullMission',
                    label: 'Full Missions',
                    config: {
                        'tags__name': ['Full_Missions'],
                    },
                },
            ],
            selectedResultType: _.get(this.$route.query, 'databaseModel', 'EvaluationJob'),

            selectedTimeInfo: {
                start: undefined,
                end: undefined,
                shortcut: undefined,
            },

            dateTimePickerKey: 0,
            selectedShortcut: undefined,
            // initialize shortcut struct used by default from VueCtkDateTimePicker
            shortcuts: [
                {key: 'thisWeek', label: 'This week', value: 'isoWeek'},
                {key: 'lastWeek', label: 'Last week', value: '-isoWeek'},
                {key: 'last7Days', label: 'Last 7 days', value: 7},
                {key: 'last30Days', label: 'Last 30 days', value: 30},
                {key: 'thisMonth', label: 'This month', value: 'month'},
                {key: 'lastMonth', label: 'Last month', value: '-month'},
                {key: 'thisYear', label: 'This year', value: 'year'},
                {key: 'lastYear', label: 'Last year', value: '-year'},
            ],

            modelFields: undefined,

            optionFilters: undefined,
            selectedFilter: undefined,
            filters: [],

            config: _.cloneDeep(this.$route.query),
            defaultOptions: {},
        };
    },
    beforeMount() {
        this.updateTimeData(this.$route.query);
    },
    mounted() {
        this.getQueryParameters();
        this.updateActiveButton({id: this.selectedResultType});
        this.loadFilterOptions(this.selectedResultType);
    },
    watch: {
        config: {
            deep: true,
            handler: function() {
                this.updateFilterConfig();
            },
        },
        selectedTimeInfo: {
            deep: true,
            handler: function() {
                this.updateFilterConfig();
            },
        },
        selectedResultType: function() {
            // reset filter variables
            this.modelFields = undefined;
            this.optionFilters = undefined;
            this.selectedFilter = undefined;
            this.filters = [];
            this.config = {};
            this.$router.replace({query: {}});
            // load new filter options
            this.loadFilterOptions(this.selectedResultType);
        },
        $route(updated, old) {
            if (this.selectedResultType !== _.get(updated.query, 'databaseModel', 'EvaluationJob')) {
                const index = this.resultButtons.findIndex((button) => {
                    return button.id === _.get(updated.query, 'databaseModel', 'EvaluationJob');
                });
                this.updateActiveButton(this.resultButtons[index]);
            }

            // due to VueCtkDateTimePicker we have to force an update to get shortcut values
            if (
                _.get(updated.query, 'timeRange') !== _.get(old.query, 'timeRange') ||
                _.get(updated.query, 'from_ts') !== _.get(old.query, 'from_ts') ||
                _.get(updated.query, 'to_ts') !== _.get(old.query, 'to_ts')
            ) {
                this.updateTimeData(updated.query);
            }
        },
    },
    methods: {
        updateTimeData(data) {
            // check if time range was set automatically
            if (data.timeRange) {
                this.selectedShortcut = data.timeRange;
                // increase key to force new mount
                this.dateTimePickerKey = this.dateTimePickerKey + 1;
            } else if (data.from_ts || data.to_ts) {
                // time range was set by user, use selected start and end informations
                this.selectedTimeInfo.start = (data.from_ts) ? data.from_ts : undefined;
                this.selectedTimeInfo.end = (data.to_ts) ? data.to_ts : undefined;
            } else {
                // use default time range of last 30 days
                this.selectedShortcut = 'last30Days';
                // increase key to force new mount
                this.dateTimePickerKey = this.dateTimePickerKey + 1;
            }
        },
        updateActiveButton(pressedButton) {
            this.resultButtons.forEach((button) => {
                if (button.id === pressedButton.id) {
                    button.pressed = true;
                    this.selectedResultType = pressedButton.id;
                } else {
                    button.pressed = false;
                }
            });
            this.$emit('updated-model', this.selectedResultType);
        },
        clearSearchQuery(field) {
            this.$refs['treeselect-'+field][0].trigger.searchQuery = '';
        },
        getQueryParameters() {
            // transform in treeselect compatible data (Array instead of commaseparated)
            this.config = _.cloneDeep(this.$route.query);
            Object.keys(this.config).forEach((key) => {
                if ((typeof this.config[key] === 'string' || this.config[key] instanceof String) &&
                this.config[key].split(',').length > 1) {
                    this.config[key] = this.config[key].split(',');
                } else if (key === 'tags__name') {
                    // TODO(adolphm): generic way to distinguish between multiple and single inputs
                    this.config[key] = [this.config[key]];
                }
            });
        },

        createFilters() {
            this.getQueryParameters();

            const vm = this;
            this.filters = Object.keys(this.$route.query).filter((filter) => {
                return vm.modelFields.includes(filter);
            }).sort();

            if (this.filters.length > 0) {
                this.filters.forEach((filter) => {
                    if (!this.defaultOptions[filter]) this.defaultOptions[filter] = [];
                    if (Array.isArray(this.config[filter])) {
                        this.config[filter].forEach((value) => {
                            this.defaultOptions[filter].push({
                                id: value,
                                label: value,
                            });
                        });
                    } else {
                        this.defaultOptions[filter].push({
                            id: this.config[filter],
                            label: this.config[filter],
                        });
                    }
                    this.defaultOptions[filter].push({
                        id: 'info-message',
                        label: 'Type in search box for more results..',
                        isDisabled: true,
                    });
                });
            }
        },
        // Query the server for db fields we can filter against.
        loadFilterOptions(resultType) {
            this.modelFields = undefined;
            const options = {
                method: 'GET',
                url: subDirectory + '/search-results/get-filter-fields/' + resultType,
            };

            axios(options)
                .then((response) => {
                    this.modelFields = response.data.sort();
                    this.optionFilters = this.modelFields.map((field) => {
                        return {
                            id: field,
                            label: (field === 'tags__name') ? 'tags':field,
                        };
                    });
                    this.createFilters();
                })
                .catch(function(error) {
                    console.log(error);
                });
        },
        loadOptions({action, parentNode, searchQuery, callback, instanceId}) {
            if (action === ASYNC_SEARCH) {
                // remove the currently updated field from the query parameters
                const configParams = _.cloneDeep(this.config);
                if (configParams[instanceId]) delete configParams[instanceId];

                // search for available options with respect to the other filter configurations
                const options = {
                    method: 'GET',
                    params: {...configParams, ...{
                        requested_field: instanceId,
                        search_query: searchQuery,
                    }},
                    url: subDirectory + '/search-results/get-filter-fields-options/' + this.selectedResultType,
                };

                axios(options)
                    .then((response) => {
                        const options = [];

                        
                        // check if we found related data
                        if (!response.data[instanceId].length > 0) {
                            callback(new Error('No results found: ' + searchQuery));
                        }
                        //console.log(response.data);

                        // convert into treeselect option format
                        const limit = 10;
                        const lengthGreaterLimit = (response.data[instanceId].length > limit);
                        const length = (lengthGreaterLimit)? limit:response.data[instanceId].length;
                        for (let i = 0; i < length; i++) {
                            options.push({
                                id: response.data[instanceId][i],
                                label: response.data[instanceId][i],
                            });
                            if (lengthGreaterLimit && i === limit-1) {
                                options.push({
                                    id: 'infoText',
                                    label: 'More results available, extend search to get more specific results',
                                    isDisabled: true,
                                    multiple: false,
                                });
                            }
                        }
                        // update treeselect
                        callback(null, options);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
            }
        },
        addFilter() {
            if (this.selectedFilter) {
                if (!this.filters.includes(this.selectedFilter)) {
                    this.filters.push(this.selectedFilter);
                }
                this.selectedFilter = null;
            }
        },
        mergeCustomizer(objValue, srcValue) {
            if (_.isArray(objValue)) {
                return [...new Set(objValue.concat(srcValue))];
            }
        },
        addQuickFilter(filter) {
            // update filter visualization
            Object.keys(filter.config).forEach((filterKey) => {
                if (!this.filters.includes(filterKey)) {
                    this.filters.push(filterKey);
                    // Vue.set(this.config, filterKey, undefined);
                }
            });
            // update filter in config
            this.config = _.cloneDeep(_.mergeWith(this.config, filter.config, this.mergeCustomizer));
            this.updateFilterConfig();

            this.$nextTick(()=> {
                Object.keys(filter.config).forEach((filterKey) => {
                    if (_.isArray(this.config[filterKey])) {
                        this.config[filterKey].forEach((filterValue) => {
                            this.$refs['treeselect-'+filterKey][0].forest.nodeMap[filterValue].label = filterValue;
                        });
                    } else {
                        this.$refs['treeselect-'+filterKey][0]
                            .forest.nodeMap[this.config[filterKey]].label = this.config[filterKey];
                    }
                });
            });
        },
        removeFilter(field) {
            if (this.filters.includes(field)) {
                this.filters = _.remove(this.filters, function(n) {
                    return n !== field;
                });
                this.$delete(this.config, field);
            }
        },
        updateFilterConfig() {
            // get local copy to transform array field into joined string field (backend compatibility)
            const copyConfig = _.cloneDeep(this.config);
            Object.keys(copyConfig).forEach((key) => {
                if (Array.isArray(copyConfig[key])) {
                    copyConfig[key] = copyConfig[key].join(',');
                }
            });
            // if shortcut (predefined time range) is selected, report key instead of value
            if (_.get(this.selectedTimeInfo, 'shortcut')) {
                copyConfig.timeRange = this.shortcuts.find((shortcut) => {
                    return shortcut.value === this.selectedTimeInfo.shortcut;
                }).key;
            } else {
                delete copyConfig.timeRange;
            }

            copyConfig.from_ts = this.selectedTimeInfo.start;
            copyConfig.to_ts = this.selectedTimeInfo.end;
            copyConfig.databaseModel = this.selectedResultType;

            // check if route would change before updating
            if (!_.isEqual(this.$route.query, copyConfig)) {
                this.$router.replace({query: copyConfig});
                this.$emit('updated-filter', copyConfig);
            }
        },
    },
};
</script>
